'use strict';

// ── Module state ──────────────────────────────────────────────
let sigAssignments = [];
let sigRotation    = 0;      // 0–3 display rotation offset
let _sigModalCell  = null;   // { row, col } currently in edit

// ── Bootstrap ─────────────────────────────────────────────────
async function initSignals() {
  console.log('[initSignals] loading signal assignments…');
  sigAssignments = await sigLoadAll();
  console.log('[initSignals] loaded', sigAssignments.length, 'assignments');
  renderSigGrid();
  renderSigPreviews();
}

// ── Play library bridge ────────────────────────────────────────
function sigGetPlayLib() {
  if (typeof cloudLib !== 'undefined' && cloudLib && cloudLib.length) return cloudLib;
  try { return JSON.parse(localStorage.getItem('gridiron_pro_v3_lib') || '[]'); }
  catch { return []; }
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
      if (!a) {
        html += `<div class="sig-cell sig-cell-empty" onclick="openSigModal('${row}',${col})">
          <span class="sig-cell-id">${sigCellId(row,col)}</span>
          <span class="sig-cell-hint">tap to assign</span>
        </div>`;
        return;
      }
      const cf     = SIG_COLORS[a.color_family] || SIG_COLORS.green;
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
  const real    = sigAssignments.filter(a => !a.is_dummy && a.play_id);
  if (!real.length) {
    wrap.innerHTML = '<div class="sig-preview-empty">Assign plays to the grid to see the wristband preview.</div>';
    return;
  }
  const caller  = real[0]?.live_caller || 'OC';
  const serSet  = [...new Set(real.map(a => a.series_rotation))];
  const serLbl  = serSet.length === 1 ? (serSet[0] === 0 ? 'All Series' : `Q${serSet[0]}`) : 'Multi-Series';

  let g = '<div class="sig-wb-card"><div class="sig-wb-hdr">';
  g += `<span class="sig-wb-caller">CALLER: ${sigEsc(caller)}</span>`;
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
      if (!a) { g += '<div class="sig-wb-cell sig-wb-empty"></div>'; return; }
      const cf   = SIG_COLORS[a.color_family] || SIG_COLORS.green;
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
    const cf    = SIG_COLORS[a.color_family] || SIG_COLORS.green;
    const dZone = sigRotateZone(a.signal_body_zone, sigRotation);
    const ser   = a.series_rotation === 0 ? 'All' : `Q${a.series_rotation}`;
    rows += `<tr>
      <td class="sk-cell">${sigCellId(a.wristband_row, a.wristband_col)}</td>
      <td>${SIG_ZONE_LABELS[dZone]}</td>
      <td class="sk-ctr">${a.signal_fingers}</td>
      <td><span class="sk-dot" style="background:${cf.hex}"></span>${(a.color_family||'').charAt(0).toUpperCase()+(a.color_family||'').slice(1)}</td>
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
      <div class="sig-key-title">SIGNAL KEY <span class="sig-key-sub">Coach Reference</span>
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

  document.getElementById('sig-modal-title').textContent = `CELL ${sigCellId(row, col)}`;
  document.getElementById('sig-modal-sub').textContent =
    `Grid position ${row}${col} · Default signal: ${SIG_ZONE_LABELS[sigDefaultZone(col)]} + ${sigDefaultFingers(row)} finger(s)`;

  sigPopulatePlayDrop(existing?.play_id || '');
  document.getElementById('sig-modal-color').value   = existing?.color_family   || 'green';
  document.getElementById('sig-modal-zone').value    = existing?.signal_body_zone || sigDefaultZone(col);
  document.getElementById('sig-modal-fingers').value = existing?.signal_fingers   || sigDefaultFingers(row);
  document.getElementById('sig-modal-caller').value  = existing?.live_caller       || 'OC';
  document.getElementById('sig-modal-series').value  = String(existing?.series_rotation ?? 0);
  document.getElementById('sig-modal-dummy').checked = existing?.is_dummy || false;
  document.getElementById('sig-modal-err').textContent = '';
  document.getElementById('sig-modal-clear').style.display = existing ? 'flex' : 'none';
  _sigSyncColorBtns(existing?.color_family || 'green');

  document.getElementById('sig-cell-modal').classList.add('show');
}

function closeSigModal() {
  document.getElementById('sig-cell-modal').classList.remove('show');
  _sigModalCell = null;
}

function _sigSyncColorBtns(cf) {
  document.querySelectorAll('.sig-color-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.color === cf);
  });
  const inp = document.getElementById('sig-modal-color');
  if (inp) inp.value = cf;
}

function sigPickColor(cf) {
  _sigSyncColorBtns(cf);
}

async function saveSigCell() {
  if (!_sigModalCell) return;
  const { row, col } = _sigModalCell;
  const isDummy  = document.getElementById('sig-modal-dummy').checked;
  const playId   = document.getElementById('sig-modal-play').value || null;
  const errEl    = document.getElementById('sig-modal-err');

  if (!isDummy && !playId) {
    errEl.textContent = 'Select a play — or check "Mark as Decoy" for a dummy signal.';
    return;
  }

  const plays  = sigGetPlayLib();
  const play   = plays.find(p => String(p.id) === String(playId));
  const existId = sigAssignments.find(a => a.wristband_row === row && a.wristband_col === col)?.id || null;

  const candidate = {
    id:               existId,
    wristband_row:    row,
    wristband_col:    col,
    play_id:          isDummy ? null : playId,
    play_name:        isDummy ? null : (play?.name || null),
    color_family:     document.getElementById('sig-modal-color').value   || 'green',
    signal_body_zone: document.getElementById('sig-modal-zone').value,
    signal_fingers:   parseInt(document.getElementById('sig-modal-fingers').value),
    live_caller:      document.getElementById('sig-modal-caller').value  || 'OC',
    series_rotation:  parseInt(document.getElementById('sig-modal-series').value),
    is_dummy:         isDummy,
  };

  const { valid, errors } = sigValidate(sigAssignments, candidate, existId);
  if (!valid) { errEl.textContent = errors[0]; return; }

  const saved = await sigSaveOne(candidate);
  const idx   = sigAssignments.findIndex(a => a.wristband_row === row && a.wristband_col === col);
  if (idx >= 0) sigAssignments[idx] = saved; else sigAssignments.push(saved);

  closeSigModal();
  renderSigGrid();
  renderSigPreviews();
}

async function clearSigCell() {
  if (!_sigModalCell) return;
  const { row, col } = _sigModalCell;
  const existing = sigAssignments.find(a => a.wristband_row === row && a.wristband_col === col);
  if (existing) {
    await sigDeleteOne(existing.id);
    sigAssignments = sigAssignments.filter(a => !(a.wristband_row === row && a.wristband_col === col));
  }
  closeSigModal();
  renderSigGrid();
  renderSigPreviews();
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
