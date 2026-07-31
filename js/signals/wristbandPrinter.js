'use strict';

// Real insert-window dimensions used by the football wristband market
// (Football Play Card, GoRout templates, and generic QB wrist-coach
// manufacturers all converge on the same three tiers). Previously this
// printout used one guessed fixed size (4.25in x 2.75in) that didn't
// match any actual wristband brand/size -- a coach printing an insert
// for an actual Youth or Adult wristband would get a card that's either
// too big to fit the window or leaves it swimming in a too-large one.
const WRISTBAND_SIZE_PRESETS = {
  youth: { w: 3.75, h: 2.25 },
  teen:  { w: 5,    h: 2.75 },
  adult: { w: 5.25, h: 3.25 },
};

const PP_WRISTBAND_SIZE_OPTIONS = [
  { value: 'youth',  label: 'Youth — 3.75" × 2.25" window' },
  { value: 'teen',   label: 'Teen — 5" × 2.75" window' },
  { value: 'adult',  label: 'Adult — 5.25" × 3.25" window' },
  { value: 'custom', label: 'Custom size…' },
];

function wristbandSizeDims(sizeKey, customDims) {
  if (sizeKey === 'custom' && customDims) return customDims;
  return WRISTBAND_SIZE_PRESETS[sizeKey] || WRISTBAND_SIZE_PRESETS.adult;
}

async function printSigWristband() {
  const real = sigAssignments.filter(a => !a.is_dummy && a.play_id);
  if (!real.length) { alert('Add plays to the signal grid first.'); return; }

  const page = sigActivePage();
  const branding = await getTeamBranding();
  showPrintPreview(
    (size, customDims) => buildSigWristbandHtml(branding, size, customDims),
    {
      title: (page?.label || 'WRISTBAND') + ' — QB Insert',
      sizeOptions: PP_WRISTBAND_SIZE_OPTIONS,
      sizeLabel: 'Wristband Size',
      sizePrefKey: 'wristbandSize',
    }
  );
}

// sizeKey is one of WRISTBAND_SIZE_PRESETS' keys or 'custom' (with
// customDims = {w,h} in inches, supplied by the print-preview size
// picker). There's still no room on a card this small for a logo
// header, but the footer used to hardcode "Wylie's Play Maker" (the
// app's own name) regardless of whose team it was -- swapped for the
// team's actual name instead.
function buildSigWristbandHtml(branding, sizeKey, customDims) {
  const page    = sigActivePage();
  const real    = sigAssignments.filter(a => !a.is_dummy && a.play_id);
  const caller  = real[0]?.live_caller || 'OC';
  const serSet  = [...new Set(sigAssignments.map(a => a.series_rotation))];
  const serLbl  = serSet.length === 1 ? (serSet[0] === 0 ? 'All Series' : `Q${serSet[0]}`) : 'Multi-Series';
  const rotNote = sigRotation > 0 ? ` [ROT +${sigRotation}]` : '';

  // Columns are finger count only; body zone is fixed per row instead
  // (see signalEncoder.js) and printed on the row header below.
  const colFingers = [1,2,3,4].map(c => sigDefaultFingers(c));

  let cells = '';
  // corner + col headers
  cells += `<div class="ww-corner"></div>`;
  colFingers.forEach(f => { cells += `<div class="ww-col">${f === 4 ? 'FIST' : f + 'F'}</div>`; });

  SIG_ROWS.forEach(row => {
    const rowZone = sigRowHeader(row, sigRotation);
    cells += `<div class="ww-row">${row}<span class="ww-row-zone">${SIG_ZONE_ABBR[rowZone]}</span></div>`;
    SIG_COLS.forEach(col => {
      const a = sigAssignments.find(x => x.wristband_row === row && x.wristband_col === col);
      if (!a) { cells += '<div class="ww-cell ww-empty"></div>'; return; }
      const cf   = SIG_COLORS[sigColorForRow(page, row)]?.hex || '#888';
      // a.play_name is joined from the plays table (sigLoadCalls).
      const name = a.is_dummy ? '—' : (a.play_name || '???');
      const abbr = name.length > 14 ? name.slice(0,13)+'…' : name;
      cells += `<div class="ww-cell" style="border-left:3px solid ${cf};${a.is_dummy?'opacity:.45;':''}">
        <span class="ww-id">${sigCellId(row,col)}</span>
        <span class="ww-name">${abbr}</span>
      </div>`;
    });
  });

  const dims   = wristbandSizeDims(sizeKey, customDims);
  const margin = 0.1;
  // Explicit width/height already encodes the landscape shape for every
  // preset (all wider than tall) and for any sane custom entry -- no
  // separate "landscape" keyword needed, and it would just be ambiguous
  // against explicit dimensions in most browsers' print engines anyway.
  const bodyW  = Math.max(dims.w - margin * 2, 1);
  const bodyH  = Math.max(dims.h - margin * 2, 0.8);

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>QB Wristband Insert</title>
<style>
@page{size:${dims.w}in ${dims.h}in;margin:${margin}in;}
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:Arial,Helvetica,sans-serif;background:#fff;color:#000;width:${bodyW}in;height:${bodyH}in;overflow:hidden;}
.ww-outer{display:flex;flex-direction:column;height:${bodyH}in;}
.ww-top{background:#111;color:#fff;padding:2px 8px;font-size:8pt;font-weight:700;letter-spacing:1px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;}
.ww-top .rot{color:#f0a500;font-size:7pt;}
.ww-grid{display:grid;grid-template-columns:16px repeat(4,1fr);grid-template-rows:12px repeat(4,1fr);flex:1;border:2px solid #111;}
.ww-corner,.ww-col{background:#222;color:#fff;font-size:7pt;font-weight:700;text-align:center;display:flex;align-items:center;justify-content:center;border-right:1px solid #444;border-bottom:1px solid #444;}
.ww-row{background:#222;color:#fff;font-size:8pt;font-weight:700;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.1;gap:1px;border-right:1px solid #444;border-bottom:1px solid #333;}
.ww-row-zone{font-size:5.5pt;font-weight:400;color:#aaa;}
.ww-cell{display:flex;flex-direction:column;justify-content:center;padding:1px 3px;border-right:1px solid #ccc;border-bottom:1px solid #ccc;}
.ww-empty{background:#f5f5f5;}
.ww-id{font-size:6pt;color:#999;font-weight:700;line-height:1;}
.ww-name{font-size:8.5pt;font-weight:700;color:#111;line-height:1.1;overflow:hidden;}
.ww-bot{background:#f0f0f0;padding:2px 8px;font-size:7pt;display:flex;justify-content:space-between;border-top:1px solid #ccc;flex-shrink:0;}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
</style></head><body>
<div class="ww-outer">
  <div class="ww-top">
    <span>LIVE CALLER: ${caller}${rotNote ? `<span class="rot"> ${rotNote}</span>` : ''}</span>
    <span>${sigEsc(page?.label || 'WRISTBAND')} — QB INSERT</span>
  </div>
  <div class="ww-grid">${cells}</div>
  <div class="ww-bot"><span>${serLbl}</span><span>${sigEsc(branding.name)}</span></div>
</div>
</body></html>`;

  return html;
}
