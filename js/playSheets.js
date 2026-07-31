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
  psShowList();
  await psLoadSheets();
}

// ── List view ────────────────────────────────────────────────
async function psLoadSheets() {
  const { data, error } = await supa
    .from('gameday_playbooks')
    .select('*, gameday_playbook_plays(count)')
    .eq('team_id', currentTeamId)
    .order('created_at', { ascending: false });
  if (error) { console.error('[psLoadSheets] failed:', error.message); setStatus('Could not load play sheets — ' + error.message); return; }
  psSheets = data || [];
  renderPsSheetList();
}

function renderPsSheetList() {
  const wrap = document.getElementById('ps-sheet-list');
  if (!wrap) return;
  if (!psSheets.length) {
    wrap.innerHTML = '<div class="dash-games-empty">No play sheets yet — create your first one.</div>';
    return;
  }
  wrap.innerHTML = '';
  psSheets.forEach(s => {
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

async function psCreateSheet() {
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
function psShowList() {
  document.getElementById('ps-list-view').style.display = 'block';
  document.getElementById('ps-editor-view').style.display = 'none';
  psActiveSheetId = null;
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
    .select('play_id, section, sort_order, plays(name, formation, type, client_id)')
    .eq('gameday_playbook_id', psActiveSheetId)
    .order('sort_order', { ascending: true });
  if (rowsErr) { setStatus('Could not load plays — ' + rowsErr.message); return; }

  psActiveSheetPlays = (rows || []).map(r => ({
    play_id: r.play_id,
    section: r.section || PS_SECTIONS[0],
    sort_order: r.sort_order,
    play: r.plays || { name: '(deleted play)', formation: '', type: '' },
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
