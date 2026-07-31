'use strict';

// ============================================================================
// Coach's Play Sheets — a printable, savable, situational call sheet built
// from Team Library plays, grouped into sections, optionally linked to a
// game. Backed by gameday_playbooks + gameday_playbook_plays.
//
// gameday_playbook_plays.play_id is a real plays.id (uuid) FK, but Team
// Library plays only exist client-side under a JS-generated numeric id.
// psEnsureCloudPlay() lazily materializes (or reuses) exactly one real
// plays row per team-library play the first time it's added to a sheet,
// keyed on plays.client_id so the same play is never duplicated.
// ============================================================================

const PS_SECTIONS = ['OPENERS', 'RUN GAME', 'PASS GAME', '3RD DOWN', 'RED ZONE', 'GOAL LINE', '2-MINUTE', 'TRICK / SPECIAL'];

let psSheets = [];
let psGames = [];    // this team's scheduled opponents, for the game-tile landing view
let psActiveSheetId = null;
let psActiveSheetName = '';
let psActiveSheetPlays = []; // [{ play_id (uuid), section, sort_order, play: {name, formation, type} }]
let psOpponentsCache = [];

async function psInit() {
  if (!currentTeamId) {
    console.warn('[psInit] no team context yet');
    setStatus(teamContextError ? "Play Sheets aren't available yet — " + teamContextError : 'Setting up your team — try Play Sheets again in a moment.', 'err');
    return;
  }
  await psShowList();
}

// ── List view ────────────────────────────────────────────────
// The landing view is organized around GAMES first, sheets second -- a
// coach thinks "build the call sheet for Friday's game against Eastside",
// not "create a play sheet, then remember to link it to a game" (the old
// flow: a generic "+ New Play Sheet" button, then a separate "Linked
// Game" dropdown buried inside the editor). Every game on the schedule
// gets a tile; tapping one opens its sheet, creating it on first tap if
// it doesn't exist yet. Sheets with no game (scout templates, etc.) still
// exist and show in a plain list below the tiles.
async function psLoadSheets() {
  const [gamesRes, sheetsRes] = await Promise.all([
    supa.from('opponents').select('id, name, game_date, location')
      .eq('team_id', currentTeamId)
      .eq('season_id', currentSeasonId)
      .order('game_date', { ascending: true, nullsFirst: false }),
    supa.from('gameday_playbooks').select('*, gameday_playbook_plays(count)')
      .eq('team_id', currentTeamId)
      .order('created_at', { ascending: false }),
  ]);
  if (gamesRes.error) { console.error('[psLoadSheets] games failed:', gamesRes.error.message); setStatus('Could not load schedule — ' + gamesRes.error.message); return; }
  if (sheetsRes.error) { console.error('[psLoadSheets] sheets failed:', sheetsRes.error.message); setStatus('Could not load play sheets — ' + sheetsRes.error.message); return; }
  psGames = gamesRes.data || [];
  psSheets = sheetsRes.data || [];
  renderPsLanding();
}

function psFormatGameDate(dateStr) {
  if (!dateStr) return 'DATE TBD';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
}

function renderPsLanding() {
  renderPsGameTiles();
  renderPsGeneralSheets();
}

function renderPsGameTiles() {
  const wrap = document.getElementById('ps-game-tiles');
  if (!wrap) return;
  if (!psGames.length) {
    wrap.innerHTML = '<div class="dash-games-empty">No games on your schedule yet — add one from the Home tab, then its call sheet will show up here.</div>';
    return;
  }
  wrap.innerHTML = '';
  psGames.forEach(g => {
    const sheet = psSheets.find(s => s.opponent_id === g.id);
    const count = sheet?.gameday_playbook_plays?.[0]?.count ?? 0;
    const tile = document.createElement('div');
    tile.className = 'ps-game-tile';
    tile.onclick = () => psOpenOrCreateForGame(g);
    tile.innerHTML = `
      <div class="ps-game-tile-top">
        <span class="ps-game-tile-date">${psFormatGameDate(g.game_date)}</span>
        <span class="ps-game-tile-loc ${g.location || 'home'}">${(g.location || 'home').toUpperCase()}</span>
      </div>
      <div class="ps-game-tile-name"></div>
      <span class="ps-game-tile-badge ${sheet ? 'has-sheet' : 'none'}">${sheet ? `${count} play${count === 1 ? '' : 's'}` : 'no sheet yet'}</span>
    `;
    tile.querySelector('.ps-game-tile-name').textContent = g.name || 'Opponent TBD';
    wrap.appendChild(tile);
  });
}

function renderPsGeneralSheets() {
  const wrap = document.getElementById('ps-general-sheet-list');
  const section = document.getElementById('ps-general-sheets-section');
  if (!wrap || !section) return;
  const general = psSheets.filter(s => !s.opponent_id);
  section.style.display = general.length ? 'block' : 'none';
  wrap.innerHTML = '';
  general.forEach(s => {
    const count = s.gameday_playbook_plays?.[0]?.count ?? 0;
    const card = document.createElement('div');
    card.className = 'ps-sheet-card';
    card.onclick = () => psShowEditor(s.id);
    card.innerHTML = `
      <div class="ps-sheet-card-main">
        <div class="ps-sheet-card-name"></div>
        <div class="ps-sheet-card-meta">${count} play${count === 1 ? '' : 's'}</div>
      </div>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;color:var(--text-lo);flex-shrink:0;"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
    `;
    card.querySelector('.ps-sheet-card-name').textContent = s.name;
    wrap.appendChild(card);
  });
}

// Opens a game's existing sheet, or creates one (pre-named and pre-linked
// to the game) the first time a coach taps that tile -- this is the one
// step that replaces "create a blank sheet, then find and use the Linked
// Game dropdown" from the old flow.
async function psOpenOrCreateForGame(game) {
  const existing = psSheets.find(s => s.opponent_id === game.id);
  if (existing) { await psShowEditor(existing.id); return; }
  if (!currentTeamId) { setStatus("Your team isn't set up yet — try reloading the page.", 'err'); return; }
  const { data, error } = await supa
    .from('gameday_playbooks')
    .insert({ team_id: currentTeamId, name: `vs ${game.name || 'Opponent'}`, opponent_id: game.id })
    .select('*')
    .single();
  if (error) { setStatus('Could not create play sheet — ' + error.message); return; }
  await psLoadSheets();
  await psShowEditor(data.id);
}

async function psCreateGeneralSheet() {
  if (!currentTeamId) { setStatus("Your team isn't set up yet — try reloading the page.", 'err'); return; }
  const { data, error } = await supa
    .from('gameday_playbooks')
    .insert({ team_id: currentTeamId, name: 'New Play Sheet' })
    .select('*')
    .single();
  if (error) { setStatus('Could not create play sheet — ' + error.message); return; }
  await psLoadSheets();
  await psShowEditor(data.id);
  const nameInput = document.getElementById('ps-sheet-name');
  if (nameInput) { nameInput.focus(); nameInput.select(); }
}

// ── Editor view ──────────────────────────────────────────────
async function psShowList() {
  document.getElementById('ps-list-view').style.display = 'block';
  document.getElementById('ps-editor-view').style.display = 'none';
  psActiveSheetId = null;
  // Refresh so a tile's play count reflects whatever was just edited.
  await psLoadSheets();
}

async function psShowEditor(sheetId) {
  psActiveSheetId = sheetId;
  document.getElementById('ps-list-view').style.display = 'none';
  document.getElementById('ps-editor-view').style.display = 'flex';
  await Promise.all([psLoadSheetDetail(), psLoadOpponentOptions()]);
}

async function psLoadSheetDetail() {
  const { data: sheet, error: sheetErr } = await supa
    .from('gameday_playbooks')
    .select('*')
    .eq('id', psActiveSheetId)
    .single();
  if (sheetErr) { setStatus('Could not load play sheet — ' + sheetErr.message); return; }
  psActiveSheetName = sheet.name;
  document.getElementById('ps-sheet-name').value = sheet.name;
  document.getElementById('ps-sheet-opponent').dataset.selected = sheet.opponent_id || '';

  const { data: rows, error: rowsErr } = await supa
    .from('gameday_playbook_plays')
    // players/routes/mode/thumbnail are needed to render an install-sheet
    // diagram for each play (see psPrintInstallPacket) -- the original
    // select only pulled name/formation/type/client_id, which was enough
    // for the text-only call sheet but not for drawing the field.
    .select('play_id, section, sort_order, plays(name, formation, type, mode, players, routes, thumbnail, client_id)')
    .eq('gameday_playbook_id', psActiveSheetId)
    .order('sort_order', { ascending: true });
  if (rowsErr) { setStatus('Could not load plays — ' + rowsErr.message); return; }

  psActiveSheetPlays = (rows || []).map(r => ({
    play_id: r.play_id,
    section: r.section || PS_SECTIONS[0],
    sort_order: r.sort_order,
    play: r.plays || { name: '(deleted play)', formation: '', type: '', players: [], routes: [] },
  }));
  renderPsSections();
}

async function psLoadOpponentOptions() {
  const sel = document.getElementById('ps-sheet-opponent');
  if (!sel) return;
  if (!psOpponentsCache.length) {
    const { data, error } = await supa
      .from('opponents')
      .select('id, name, game_date')
      .eq('team_id', currentTeamId)
      .order('game_date', { ascending: true });
    if (!error) psOpponentsCache = data || [];
  }
  const selected = sel.dataset.selected || '';
  sel.innerHTML = '<option value="">— No game selected —</option>' +
    psOpponentsCache.map(o => `<option value="${o.id}"${String(o.id) === selected ? ' selected' : ''}>${sigEsc(o.name)}${o.game_date ? ' · ' + o.game_date : ''}</option>`).join('');
}

function renderPsSections() {
  const wrap = document.getElementById('ps-sections');
  if (!wrap) return;
  const lib = getLib();
  // Plays already on this sheet are tracked by cloud play_id, but the
  // Team Library dropdown works in client-side ids -- plays.client_id
  // (fetched alongside each row) is the bridge between the two.
  const usedClientIds = new Set(psActiveSheetPlays.map(p => p.play.client_id).filter(Boolean));

  wrap.innerHTML = '';
  PS_SECTIONS.forEach(section => {
    const plays = psActiveSheetPlays.filter(p => p.section === section).sort((a, b) => a.sort_order - b.sort_order);
    const sec = document.createElement('div');
    sec.className = 'ps-section';

    const playsHtml = plays.length
      ? plays.map((p, i) => `
        <div class="ps-play-row">
          <span class="ps-play-num">${i + 1}</span>
          <span class="ps-play-name"></span>
          <span class="ps-play-meta"></span>
          <div class="ps-play-acts">
            <button title="Move up" ${i === 0 ? 'disabled style="opacity:.3;"' : ''} onclick="psMovePlay('${section}','${p.play_id}',-1)">↑</button>
            <button title="Move down" ${i === plays.length - 1 ? 'disabled style="opacity:.3;"' : ''} onclick="psMovePlay('${section}','${p.play_id}',1)">↓</button>
            <button title="Print install sheet for this play" onclick="psPrintSinglePlay('${p.play_id}')">🖶</button>
            <button class="ps-del" title="Remove" onclick="psRemovePlay('${p.play_id}')">✕</button>
          </div>
        </div>`).join('')
      : '<div class="ps-section-empty">No plays in this section yet.</div>';

    const availablePlays = lib.filter(pl => !usedClientIds.has(String(pl.id)));
    const selId = `ps-add-sel-${section.replace(/[^A-Z0-9]/gi, '')}`;

    sec.innerHTML = `
      <div class="ps-section-hdr"><span>${section}</span><span>${plays.length}</span></div>
      <div class="ps-section-plays">${playsHtml}</div>
      <div class="ps-add-row">
        <select class="rp-select" id="${selId}">
          <option value="">${availablePlays.length ? '— select a play to add —' : 'No unused Team Library plays'}</option>
          ${availablePlays.map(pl => `<option value="${pl.id}">${sigEsc(pl.name)}${pl.formation ? ' · ' + sigEsc(pl.formation) : ''}</option>`).join('')}
        </select>
        <button class="add-dashed" style="width:auto;padding:7px 14px;flex-shrink:0;" onclick="psAddPlay('${section}','${selId}')">+ Add</button>
      </div>`;

    // Fill in play name/meta text nodes safely (avoids HTML-injecting play names).
    plays.forEach((p, i) => {
      const row = sec.querySelectorAll('.ps-play-row')[i];
      row.querySelector('.ps-play-name').textContent = p.play.name;
      row.querySelector('.ps-play-meta').textContent = [p.play.formation, p.play.type].filter(Boolean).join(' · ');
    });

    wrap.appendChild(sec);
  });
}

// ── Mutations ────────────────────────────────────────────────
async function psRenameSheet() {
  const input = document.getElementById('ps-sheet-name');
  const name = (input.value || '').trim();
  if (!name) { input.value = psActiveSheetName; return; }
  if (name === psActiveSheetName) return;
  const { error } = await supa.from('gameday_playbooks').update({ name }).eq('id', psActiveSheetId);
  if (error) { setStatus('Could not rename — ' + error.message); return; }
  psActiveSheetName = name;
  await psLoadSheets();
}

async function psSetOpponent() {
  const sel = document.getElementById('ps-sheet-opponent');
  const opponentId = sel.value || null;
  const { error } = await supa.from('gameday_playbooks').update({ opponent_id: opponentId }).eq('id', psActiveSheetId);
  if (error) setStatus('Could not link game — ' + error.message);
}

async function psDeleteSheet() {
  if (!psActiveSheetId) return;
  const { error } = await supa.from('gameday_playbooks').delete().eq('id', psActiveSheetId);
  if (error) { setStatus('Could not delete — ' + error.message); return; }
  psShowList();
  await psLoadSheets();
}

// Lazily materializes (or reuses) a real plays.id for a Team Library play,
// keyed on plays.client_id so re-adding the same play never duplicates it.
async function psEnsureCloudPlay(clientPlay) {
  const clientId = String(clientPlay.id);
  const { data: existing, error: findErr } = await supa
    .from('plays')
    .select('id')
    .eq('team_id', currentTeamId)
    .eq('client_id', clientId)
    .maybeSingle();
  if (findErr) throw findErr;
  if (existing) return existing.id;

  const { data: created, error: createErr } = await supa
    .from('plays')
    .insert({
      team_id: currentTeamId,
      client_id: clientId,
      name: clientPlay.name,
      formation: clientPlay.formation || '',
      mode: clientPlay.mode || 'offense',
      type: clientPlay.type || '',
      players: clientPlay.players || [],
      routes: clientPlay.routes || [],
      thumbnail: clientPlay.thumb || null,
      is_global: false,
    })
    .select('id')
    .single();
  if (createErr) throw createErr;
  return created.id;
}

async function psAddPlay(section, selId) {
  const sel = document.getElementById(selId);
  const clientId = sel?.value;
  if (!clientId) return;
  const lib = getLib();
  const clientPlay = lib.find(p => String(p.id) === String(clientId));
  if (!clientPlay) { setStatus('Play not found in Team Library'); return; }

  let cloudPlayId;
  try {
    cloudPlayId = await psEnsureCloudPlay(clientPlay);
  } catch (e) {
    setStatus('Could not add play — ' + (e.message || 'unknown error'));
    return;
  }

  const sectionCount = psActiveSheetPlays.filter(p => p.section === section).length;
  const { error } = await supa.from('gameday_playbook_plays').upsert({
    gameday_playbook_id: psActiveSheetId,
    play_id: cloudPlayId,
    section,
    sort_order: sectionCount,
  }, { onConflict: 'gameday_playbook_id,play_id' });
  if (error) { setStatus('Could not add play — ' + error.message); return; }

  await psLoadSheetDetail();
  await psLoadSheets();
}

async function psRemovePlay(playId) {
  const { error } = await supa
    .from('gameday_playbook_plays')
    .delete()
    .eq('gameday_playbook_id', psActiveSheetId)
    .eq('play_id', playId);
  if (error) { setStatus('Could not remove play — ' + error.message); return; }
  await psLoadSheetDetail();
  await psLoadSheets();
}

async function psMovePlay(section, playId, delta) {
  const plays = psActiveSheetPlays.filter(p => p.section === section).sort((a, b) => a.sort_order - b.sort_order);
  const idx = plays.findIndex(p => p.play_id === playId);
  const swapIdx = idx + delta;
  if (idx === -1 || swapIdx < 0 || swapIdx >= plays.length) return;

  const a = plays[idx], b = plays[swapIdx];
  const { error: e1 } = await supa.from('gameday_playbook_plays')
    .update({ sort_order: b.sort_order }).eq('gameday_playbook_id', psActiveSheetId).eq('play_id', a.play_id);
  const { error: e2 } = await supa.from('gameday_playbook_plays')
    .update({ sort_order: a.sort_order }).eq('gameday_playbook_id', psActiveSheetId).eq('play_id', b.play_id);
  if (e1 || e2) { setStatus('Could not reorder — ' + (e1 || e2).message); return; }

  await psLoadSheetDetail();
}


// ── Print ────────────────────────────────────────────────────
function psPrintSheet() {
  if (!psActiveSheetPlays.length) { alert('Add plays to this sheet first.'); return; }
  showPrintPreview((size) => buildPsSheetHtml(size), { title: psActiveSheetName + ' — Play Sheet', paperSize: true });
}

function buildPsSheetHtml(paperSize) {
  const landscape = paperSize === 'letter-landscape';
  const pageSize = landscape ? '11in 8.5in' : '8.5in 11in';
  const opponent = psOpponentsCache.find(o => String(o.id) === (document.getElementById('ps-sheet-opponent')?.value || ''));

  const sections = PS_SECTIONS
    .map(section => ({ section, plays: psActiveSheetPlays.filter(p => p.section === section).sort((a, b) => a.sort_order - b.sort_order) }))
    .filter(s => s.plays.length);

  const sectionsHtml = sections.map(s => `
    <div class="pshs">
      <div class="pshs-hdr">${sigEsc(s.section)}</div>
      <table class="pshs-table">
        ${s.plays.map((p, i) => `
          <tr>
            <td class="pshs-num">${i + 1}</td>
            <td class="pshs-name">${sigEsc(p.play.name)}</td>
            <td class="pshs-meta">${sigEsc([p.play.formation, p.play.type].filter(Boolean).join(' · '))}</td>
          </tr>`).join('')}
      </table>
    </div>`).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>${sigEsc(psActiveSheetName)} — Play Sheet</title>
<style>
@page{size:${pageSize};margin:.5in;}
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:Arial,Helvetica,sans-serif;background:#fff;color:#000;font-size:10pt;}
.psh-hdr{display:flex;justify-content:space-between;align-items:baseline;border-bottom:3px solid #111;padding-bottom:8px;margin-bottom:14px;}
.psh-title{font-size:20pt;font-weight:700;letter-spacing:.5px;}
.psh-opp{font-size:11pt;color:#444;}
.psh-cols{column-count:${landscape ? 2 : 1};column-gap:.4in;}
.pshs{break-inside:avoid;margin-bottom:14px;border:1px solid #999;border-radius:4px;overflow:hidden;}
.pshs-hdr{background:#111;color:#fff;font-size:10pt;font-weight:700;letter-spacing:1px;padding:4px 10px;}
.pshs-table{width:100%;border-collapse:collapse;}
.pshs-table td{padding:4px 10px;border-bottom:1px solid #ddd;font-size:9.5pt;}
.pshs-table tr:last-child td{border-bottom:none;}
.pshs-table tr:nth-child(even) td{background:#f7f7f7;}
.pshs-num{width:22px;color:#888;font-weight:700;}
.pshs-name{font-weight:700;white-space:nowrap;}
.pshs-meta{color:#555;width:100%;}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
</style></head><body>
<div class="psh-hdr">
  <span class="psh-title">${sigEsc(psActiveSheetName)}</span>
  <span class="psh-opp">${opponent ? 'vs ' + sigEsc(opponent.name) + (opponent.game_date ? ' · ' + opponent.game_date : '') : ''}</span>
</div>
<div class="psh-cols">${sectionsHtml}</div>
</body></html>`;
}

// ── Player Install Sheets ────────────────────────────────────
// A separate document from the coach's call sheet above: one play per
// page, big diagram, meant to be handed to a kid to study -- not dense
// or abbreviated. Reuses renderPlayToCanvas() (app.html), the same
// renderer already used for Team Library/Play Database thumbnails, so
// the diagram a player studies always matches what the coach designed.
function psPlayDiagramDataUrl(play) {
  const canvas = document.createElement('canvas');
  canvas.width = 700;
  canvas.height = 568;
  renderPlayToCanvas(play, canvas);
  return canvas.toDataURL('image/png');
}

function psInstallSheetStyles() {
  return `
@page{size:8.5in 11in;margin:.5in;}
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:Arial,Helvetica,sans-serif;background:#fff;color:#000;}
.pis-page{break-after:page;padding:.1in;}
.pis-page:last-child{break-after:auto;}
.pis-hdr{display:flex;justify-content:space-between;align-items:baseline;border-bottom:3px solid #111;padding-bottom:8px;margin-bottom:14px;}
.pis-name{font-size:26pt;font-weight:700;letter-spacing:.5px;}
.pis-meta{font-size:12pt;color:#444;text-align:right;}
.pis-diagram{width:100%;border:2px solid #111;border-radius:6px;overflow:hidden;}
.pis-diagram img{display:block;width:100%;height:auto;}
.pis-footer{margin-top:10px;font-size:9pt;color:#888;text-align:center;}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}`;
}

function psInstallSheetPageHtml(play) {
  const dataUrl = psPlayDiagramDataUrl(play);
  return `<div class="pis-page">
    <div class="pis-hdr">
      <span class="pis-name">${sigEsc(play.name)}</span>
      <span class="pis-meta">${sigEsc([play.formation, play.type].filter(Boolean).join(' · '))}</span>
    </div>
    <div class="pis-diagram"><img src="${dataUrl}" alt=""></div>
    <div class="pis-footer">Study your assignment on this play, then hand this back to your coach.</div>
  </div>`;
}

// One play, printed on its own -- the print icon on each play row in the
// editor.
function psPrintSinglePlay(playId) {
  const row = psActiveSheetPlays.find(p => p.play_id === playId);
  if (!row) return;
  showPrintPreview(() => `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>${sigEsc(row.play.name)} — Install Sheet</title>
<style>${psInstallSheetStyles()}</style></head><body>${psInstallSheetPageHtml(row.play)}</body></html>`,
    { title: row.play.name + ' — Install Sheet' });
}

// Every play on the current sheet, in its current sorted order, as a
// multi-page packet -- one page per play -- so a coach can hand a kid
// exactly the plays they need to learn for this game in one print job.
function psPrintInstallPacket() {
  if (!psActiveSheetPlays.length) { alert('Add plays to this sheet first.'); return; }
  const ordered = PS_SECTIONS
    .flatMap(section => psActiveSheetPlays.filter(p => p.section === section).sort((a, b) => a.sort_order - b.sort_order));
  showPrintPreview(() => `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>${sigEsc(psActiveSheetName)} — Install Packet</title>
<style>${psInstallSheetStyles()}</style></head><body>${ordered.map(p => psInstallSheetPageHtml(p.play)).join('')}</body></html>`,
    { title: psActiveSheetName + ' — Install Packet' });
}
