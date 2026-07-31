'use strict';

// ── Module state ──────────────────────────────────────────────
let sigWristbandId = null;
let sigPages       = [];     // all pages for this wristband
let sigActivePageId = null;
let sigAssignments = [];     // calls for the ACTIVE page only
let sigRotation    = 0;      // 0–3 display rotation offset (resets per page)
let _sigModalCell  = null;   // { row, col } currently in edit

// ── Bootstrap ─────────────────────────────────────────────────
async function initSignals() {
  try {
    console.log('[initSignals] resolving wristband…');
    sigWristbandId = await sigEnsureWristband();
    sigPages = await sigLoadPages(sigWristbandId);
    sigActivePageId = sigPages[0]?.id || null;
    await sigLoadActivePage();
    renderSigPageTabs();
  } catch (e) {
    console.error('[initSignals] failed:', e.message || e);
    setStatus('Could not load your wristband — ' + (e.message || 'unknown error'));
  }
}

async function sigLoadActivePage() {
  if (!sigActivePageId) { sigAssignments = []; renderSigGrid(); renderSigPreviews(); renderSigPageColorControls(); return; }
  sigAssignments = await sigLoadCalls(sigActivePageId);
  sigRotation = 0;
  renderSigGrid();
  renderSigPreviews();
  renderSigPageColorControls();
}

async function switchSigPage(pageId) {
  if (pageId === sigActivePageId) return;
  sigActivePageId = pageId;
  renderSigPageTabs();
  await sigLoadActivePage();
}

function sigActivePage() {
  return sigPages.find(p => p.id === sigActivePageId) || null;
}

// Resolve the color a given row should render as on the active page:
// a solid page color wins outright; otherwise fall back to that row's
// entry in row_colors, defaulting to green if neither is set.
function sigColorForRow(page, row) {
  if (!page) return 'green';
  if (page.color_family) return page.color_family;
  return (page.row_colors && page.row_colors[row]) || 'green';
}

// ── Page tabs ────────────────────────────────────────────────
function renderSigPageTabs() {
  const wrap = document.getElementById('sig-page-tabs');
  if (!wrap) return;
  wrap.innerHTML = sigPages.map(p => {
    const cf = p.color_family ? SIG_COLORS[p.color_family] : null;
    const dotHtml = cf
      ? `<span class="sig-page-tab-dot" style="background:${cf.hex}"></span>`
      : `<span class="sig-page-tab-dot sig-page-tab-dot-multi"></span>`;
    const act = p.id === sigActivePageId ? ' act' : '';
    return `<button class="sig-page-tab${act}" onclick="switchSigPage('${p.id}')">${dotHtml}${sigEsc(p.label)}</button>`;
  }).join('');
}

// ── Page color-mode controls ────────────────────────────────────
// modeOverride lets the mode <select>'s onchange preview "solid" vs "rows"
// controls immediately, without writing anything until Save is clicked.
function renderSigPageColorControls(modeOverride) {
  const wrap = document.getElementById('sig-page-color-ctrl');
  if (!wrap) return;
  const page = sigActivePage();
  if (!page) { wrap.innerHTML = ''; return; }

  const mode = modeOverride || (page.color_family ? 'solid' : 'rows');
  const colorOptions = c => Object.keys(SIG_COLORS).map(k =>
    `<option value="${k}"${c === k ? ' selected' : ''}>${k.toUpperCase()} — ${SIG_COLORS[k].label}</option>`
  ).join('');

  let html = `
    <div class="rp-group" style="flex-direction:row;align-items:center;gap:8px;">
      <label class="rp-label" style="margin:0;">Page Color</label>
      <select class="rp-select" id="sig-page-mode-sel" style="width:auto;" onchange="sigOnPageModeChange()">
        <option value="solid"${mode === 'solid' ? ' selected' : ''}>Solid page color</option>
        <option value="rows"${mode === 'rows' ? ' selected' : ''}>Color per row</option>
      </select>
    </div>`;

  if (mode === 'solid') {
    html += `
    <div class="rp-group" style="flex-direction:row;align-items:center;gap:8px;">
      <select class="rp-select" id="sig-page-solid-sel" style="width:auto;">
        ${colorOptions(page.color_family || 'green')}
      </select>
      <button class="add-dashed" style="width:auto;padding:6px 12px;" onclick="saveSigPageColor()">Save</button>
    </div>`;
  } else {
    const rc = page.row_colors || {};
    html += `<div class="rp-group" style="gap:6px;">` +
      SIG_ROWS.map(r => `
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="rp-label" style="margin:0;width:60px;">Row ${r}</span>
          <select class="rp-select" id="sig-page-row-sel-${r}" style="width:auto;flex:1;">
            ${colorOptions(rc[r] || 'green')}
          </select>
        </div>`).join('') +
      `<button class="add-dashed" style="margin-top:2px;" onclick="saveSigPageColor()">Save Row Colors</button>
    </div>`;
  }

  wrap.innerHTML = html;
}

function sigOnPageModeChange() {
  // Re-render immediately so switching the dropdown swaps solid<->per-row
  // controls without needing a save round-trip first. Nothing is written
  // until saveSigPageColor() runs.
  const mode = document.getElementById('sig-page-mode-sel').value;
  renderSigPageColorControls(mode);
}

async function saveSigPageColor() {
  const page = sigActivePage();
  if (!page) return;
  const mode = document.getElementById('sig-page-mode-sel').value;
  let patch;
  if (mode === 'solid') {
    const color = document.getElementById('sig-page-solid-sel').value;
    patch = { color_family: color, row_colors: {} };
  } else {
    const row_colors = {};
    SIG_ROWS.forEach(r => {
      row_colors[r] = document.getElementById(`sig-page-row-sel-${r}`)?.value || 'green';
    });
    patch = { color_family: null, row_colors };
  }
  try {
    const updated = await sigUpdatePage(page.id, patch);
    Object.assign(page, updated);
    renderSigPageTabs();
    renderSigPageColorControls();
    renderSigGrid();
    renderSigPreviews();
    setStatus(`"${page.label}" page color updated`);
  } catch (e) {
    setStatus('Could not save page color — ' + (e.message || 'unknown error'));
  }
}

// ── Play library bridge ────────────────────────────────────────
function sigGetPlayLib() {
  if (typeof cloudLib !== 'undefined' && cloudLib && cloudLib.length) return cloudLib;
  try { return JSON.parse(localStorage.getItem('gridiron_pro_v3_lib') || '[]'); }
  catch { return []; }
}

// ── Find the first open (unassigned) grid cell, row-major ──────
// Used by the Team Library "+ WB" quick-add (wbAddById in app.html) to
// jump straight to an empty slot on the currently active page instead of
// making the coach hunt for one.
function sigFindOpenCell() {
  for (const row of SIG_ROWS) {
    for (const col of SIG_COLS) {
      if (!sigAssignments.find(a => a.wristband_row === row && a.wristband_col === col)) {
        return { row, col };
      }
    }
  }
  return null;
}

// ── Populate signal play dropdown ─────────────────────────────
function sigPopulatePlayDrop(selectedId) {
  const sel  = document.getElementById('sig-modal-play');
  const prev = selectedId ?? sel?.value ?? '';
  if (!sel) return;
  const plays = sigGetPlayLib();
  sel.innerHTML = '<option value="">— None / Decoy cell —</option>';
  plays.forEach(p => {
    const o  = document.createElement('option');
    o.value  = p.id;
    const lbl = `${p.name}${p.formation ? ' · '+p.formation : ''}${p.mode ? ' ('+( p.mode==='offense'?'OFF':'DEF')+')' : ''}`;
    o.textContent = lbl;
    if (String(p.id) === String(prev)) o.selected = true;
    sel.appendChild(o);
  });
}

// ── Grid rendering ─────────────────────────────────────────────
function renderSigGrid() {
  const wrap = document.getElementById('sig-grid');
  if (!wrap) return;
  const plays = sigGetPlayLib();
  const page = sigActivePage();

  let html = '<div class="sig-grid-inner">';

  // Corner + column headers
  html += '<div class="sig-grid-corner"></div>';
  for (let c = 1; c <= 4; c++) {
    const zone = sigColHeader(c, sigRotation);
    html += `<div class="sig-col-hdr">
      <span class="sig-col-zone">${SIG_ZONE_LABELS[zone]}</span>
      <span class="sig-col-num">${SIG_ZONE_ABBR[zone]}</span>
    </div>`;
  }

  // Data rows
  SIG_ROWS.forEach(row => {
    const fingers = ROW_TO_FINGER[row];
    html += `<div class="sig-row-hdr"><span class="sig-row-letter">${row}</span><span class="sig-row-f">${fingers}f</span></div>`;
    SIG_COLS.forEach(col => {
      const a = sigAssignments.find(x => x.wristband_row === row && x.wristband_col === col);
      const cf = SIG_COLORS[sigColorForRow(page, row)] || SIG_COLORS.green;
      if (!a) {
        html += `<div class="sig-cell sig-cell-empty" onclick="openSigModal('${row}',${col})">
          <span class="sig-cell-id">${sigCellId(row,col)}</span>
          <span class="sig-cell-hint">tap to assign</span>
        </div>`;
        return;
      }
      const play   = plays.find(p => String(p.id) === String(a.play_id));
      const name   = a.is_dummy ? '—' : (play ? play.name : '?');
      const dZone  = sigRotateZone(a.signal_body_zone, sigRotation);
      const dClass = a.is_dummy ? ' sig-cell-dummy' : ' sig-cell-assigned';
      const ser    = a.series_rotation > 0 ? `<span class="sig-cell-series">Q${a.series_rotation}</span>` : '';
      html += `<div class="sig-cell${dClass}" style="border-color:${cf.hex};background:${a.is_dummy?'rgba(80,80,80,.08)':cf.bg};"
               onclick="openSigModal('${row}',${col})" title="Caller: ${a.live_caller||'OC'}">
        <span class="sig-cell-id">${sigCellId(row,col)}</span>
        <span class="sig-cell-name">${sigEsc(name)}</span>
        <span class="sig-cell-signal">
          <span class="sig-cell-dot" style="background:${cf.hex}"></span>
          ${SIG_ZONE_ABBR[dZone]}&middot;${a.signal_fingers}f
          ${a.is_dummy ? '<span class="sig-decoy-tag">DECOY</span>' : ''}
          ${ser}
        </span>
      </div>`;
    });
  });

  html += '</div>';
  wrap.innerHTML = html;
}

// ── Preview panels ─────────────────────────────────────────────
function renderSigPreviews() {
  _renderWbPreview();
  _renderKeyPreview();
}

function _renderWbPreview() {
  const wrap = document.getElementById('sig-wb-preview');
  if (!wrap) return;
  const plays   = sigGetPlayLib();
  const page    = sigActivePage();
  const real    = sigAssignments.filter(a => !a.is_dummy && a.play_id);
  if (!real.length) {
    wrap.innerHTML = '<div class="sig-preview-empty">Assign plays to the grid to see the wristband preview.</div>';
    return;
  }
  const caller  = real[0]?.live_caller || 'OC';
  const serSet  = [...new Set(real.map(a => a.series_rotation))];
  const serLbl  = serSet.length === 1 ? (serSet[0] === 0 ? 'All Series' : `Q${serSet[0]}`) : 'Multi-Series';

  let g = '<div class="sig-wb-card"><div class="sig-wb-hdr">';
  g += `<span class="sig-wb-caller">${sigEsc(page?.label || 'WRISTBAND')} · CALLER: ${sigEsc(caller)}</span>`;
  g += `<span class="sig-wb-series">${sigEsc(serLbl)}</span>`;
  g += '</div><div class="sig-wb-grid">';

  // Col headers
  g += '<div class="sig-wb-corner"></div>';
  for (let c = 1; c <= 4; c++) {
    const zone = sigColHeader(c, sigRotation);
    g += `<div class="sig-wb-col-hdr">${SIG_ZONE_ABBR[zone]}</div>`;
  }
  SIG_ROWS.forEach(row => {
    g += `<div class="sig-wb-row-hdr">${row}</div>`;
    SIG_COLS.forEach(col => {
      const a = sigAssignments.find(x => x.wristband_row === row && x.wristband_col === col);
      const cf = SIG_COLORS[sigColorForRow(page, row)] || SIG_COLORS.green;
      if (!a) { g += '<div class="sig-wb-cell sig-wb-empty"></div>'; return; }
      const play = plays.find(p => String(p.id) === String(a.play_id));
      const name = a.is_dummy ? '—' : (play ? play.name : '???');
      g += `<div class="sig-wb-cell${a.is_dummy?' sig-wb-dummy':''}" style="border-left-color:${cf.hex};">
        <div class="sig-wb-cell-name">${sigEsc(name)}</div>
      </div>`;
    });
  });
  g += '</div></div>';
  wrap.innerHTML = g;
}

function _renderKeyPreview() {
  const wrap = document.getElementById('sig-key-preview');
  if (!wrap) return;
  const plays  = sigGetPlayLib();
  const page   = sigActivePage();
  const real   = sigAssignments.filter(a => !a.is_dummy && a.play_id)
    .sort((a,b) => SIG_ROWS.indexOf(a.wristband_row)*4+(a.wristband_col-1)
                 - SIG_ROWS.indexOf(b.wristband_row)*4-(b.wristband_col-1));
  const dummies = sigAssignments.filter(a => a.is_dummy);

  if (!real.length && !dummies.length) {
    wrap.innerHTML = '<div class="sig-preview-empty">Signal key will appear here once plays are assigned.</div>';
    return;
  }

  let rows = '';
  real.forEach(a => {
    const play  = plays.find(p => String(p.id) === String(a.play_id));
    const name  = play ? play.name : '???';
    const cf    = SIG_COLORS[sigColorForRow(page, a.wristband_row)] || SIG_COLORS.green;
    const dZone = sigRotateZone(a.signal_body_zone, sigRotation);
    const ser   = a.series_rotation === 0 ? 'All' : `Q${a.series_rotation}`;
    rows += `<tr>
      <td class="sk-cell">${sigCellId(a.wristband_row, a.wristband_col)}</td>
      <td>${SIG_ZONE_LABELS[dZone]}</td>
      <td class="sk-ctr">${a.signal_fingers}</td>
      <td><span class="sk-dot" style="background:${cf.hex}"></span>${(cf.label||'')}</td>
      <td class="sk-play">${sigEsc(name)}</td>
      <td class="sk-ctr">${ser}</td>
    </tr>`;
  });

  let dummyHtml = '';
  if (dummies.length) {
    dummyHtml = '<div class="sk-dummy-section"><strong>Decoy Signals</strong> ';
    dummies.forEach(a => {
      const dZone = sigRotateZone(a.signal_body_zone, sigRotation);
      dummyHtml += `<span class="sk-dummy-chip">${sigCellId(a.wristband_row,a.wristband_col)} ${SIG_ZONE_ABBR[dZone]}&middot;${a.signal_fingers}f</span>`;
    });
    dummyHtml += '</div>';
  }

  wrap.innerHTML = `
    <div class="sig-key-card">
      <div class="sig-key-title">${sigEsc(page?.label || 'SIGNAL KEY')} <span class="sig-key-sub">Coach Reference</span>
        ${sigRotation > 0 ? `<span class="sig-rot-badge">ROT +${sigRotation}</span>` : ''}
      </div>
      <table class="sk-table">
        <thead><tr><th>Cell</th><th>Body Zone</th><th>Fingers</th><th>Color</th><th>Play</th><th>Series</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${dummyHtml}
    </div>`;
}

// ── Cell Assignment Modal ──────────────────────────────────────
function openSigModal(row, col) {
  _sigModalCell = { row, col };
  const existing = sigAssignments.find(a => a.wristband_row === row && a.wristband_col === col);
  const page = sigActivePage();

  document.getElementById('sig-modal-title').textContent = `${page ? page.label + ' — ' : ''}CELL ${sigCellId(row, col)}`;
  document.getElementById('sig-modal-sub').textContent =
    `Grid position ${row}${col} · Default signal: ${SIG_ZONE_LABELS[sigDefaultZone(col)]} + ${sigDefaultFingers(row)} finger(s)`;

  sigPopulatePlayDrop(existing?.play_id || '');
  document.getElementById('sig-modal-zone').value    = existing?.signal_body_zone || sigDefaultZone(col);
  document.getElementById('sig-modal-fingers').value = existing?.signal_fingers   || sigDefaultFingers(row);
  document.getElementById('sig-modal-caller').value  = existing?.live_caller       || 'OC';
  document.getElementById('sig-modal-series').value  = String(existing?.series_rotation ?? 0);
  document.getElementById('sig-modal-dummy').checked = existing?.is_dummy || false;
  document.getElementById('sig-modal-err').textContent = '';
  document.getElementById('sig-modal-clear').style.display = existing ? 'flex' : 'none';

  document.getElementById('sig-cell-modal').classList.add('show');
}

function closeSigModal() {
  document.getElementById('sig-cell-modal').classList.remove('show');
  _sigModalCell = null;
}

async function saveSigCell() {
  if (!_sigModalCell) return;
  const { row, col } = _sigModalCell;
  const isDummy   = document.getElementById('sig-modal-dummy').checked;
  const selPlayId = document.getElementById('sig-modal-play').value || null;
  const errEl     = document.getElementById('sig-modal-err');

  if (!isDummy && !selPlayId) {
    errEl.textContent = 'Select a play — or check "Mark as Decoy" for a dummy signal.';
    return;
  }

  // sig-modal-play's <option value> is a Team Library play's client-side id
  // (see sigGetPlayLib/sigPopulatePlayDrop) -- signal_assignments.play_id
  // and wristband_calls.play_id are real uuid FKs into plays.id, so the
  // client id has to be resolved/materialized to a real cloud play row
  // first (same lazy-materialization pattern Play Sheets uses via
  // psEnsureCloudPlay). Passing the raw client id straight through used to
  // fail with "invalid input syntax for type uuid".
  let resolvedPlayId = null;
  if (!isDummy) {
    const clientPlay = sigGetPlayLib().find(p => String(p.id) === String(selPlayId));
    if (!clientPlay) { errEl.textContent = 'That play could not be found in your Team Library — try reselecting it.'; return; }
    try {
      resolvedPlayId = await psEnsureCloudPlay(clientPlay);
    } catch (e) {
      errEl.textContent = 'Could not save this play to your cloud library — ' + (e.message || 'unknown error');
      return;
    }
  }

  const existing = sigAssignments.find(a => a.wristband_row === row && a.wristband_col === col);

  const candidate = {
    id:               existing?.id || null,
    wristband_row:    row,
    wristband_col:    col,
    play_id:          isDummy ? null : resolvedPlayId,
    signal_body_zone: document.getElementById('sig-modal-zone').value,
    signal_fingers:   parseInt(document.getElementById('sig-modal-fingers').value),
    live_caller:      document.getElementById('sig-modal-caller').value  || 'OC',
    series_rotation:  parseInt(document.getElementById('sig-modal-series').value),
    is_dummy:         isDummy,
  };

  const { valid, errors } = sigValidate(sigAssignments, candidate, existing?.id ?? null);
  if (!valid) { errEl.textContent = errors[0]; return; }

  try {
    await sigSaveCell(sigActivePageId, row, col, candidate);
  } catch (e) {
    errEl.textContent = 'Save failed — ' + (e.message || 'unknown error');
    return;
  }

  await sigLoadActivePage();
  closeSigModal();
}

async function clearSigCell() {
  if (!_sigModalCell) return;
  const { row, col } = _sigModalCell;
  try {
    await sigDeleteCell(sigActivePageId, row, col);
  } catch (e) {
    document.getElementById('sig-modal-err').textContent = 'Clear failed — ' + (e.message || 'unknown error');
    return;
  }
  closeSigModal();
  await sigLoadActivePage();
}

// ── Signal rotation ────────────────────────────────────────────
function sigRotate(delta = 1) {
  sigRotation = ((sigRotation + delta) % 4 + 4) % 4;
  const labels = ['ORIGINAL','ROT +1','ROT +2','ROT +3'];
  const lbl = document.getElementById('sig-rot-label');
  if (lbl) lbl.textContent = labels[sigRotation];
  renderSigGrid();
  renderSigPreviews();
}
