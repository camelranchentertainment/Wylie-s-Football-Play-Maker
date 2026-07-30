'use strict';

function printSigWristband() {
  const real = sigAssignments.filter(a => !a.is_dummy && a.play_id);
  if (!real.length) { alert('Add plays to the signal grid first.'); return; }

  const page = sigActivePage();
  showPrintPreview(() => buildSigWristbandHtml(), { title: (page?.label || 'WRISTBAND') + ' — QB Insert' });
}

// Fixed physical insert size (4.25in x 2.75in landscape) -- no paper-size
// picker for this one, it's a wristband card, not a page.
function buildSigWristbandHtml() {
  const page    = sigActivePage();
  const plays   = sigGetPlayLib();
  const real    = sigAssignments.filter(a => !a.is_dummy && a.play_id);
  const caller  = real[0]?.live_caller || 'OC';
  const serSet  = [...new Set(sigAssignments.map(a => a.series_rotation))];
  const serLbl  = serSet.length === 1 ? (serSet[0] === 0 ? 'All Series' : `Q${serSet[0]}`) : 'Multi-Series';
  const rotNote = sigRotation > 0 ? ` [ROT +${sigRotation}]` : '';

  // Col header zones with rotation applied
  const colZones = [1,2,3,4].map(c => {
    const z = sigColHeader(c, sigRotation);
    return SIG_ZONE_ABBR[z];
  });

  let cells = '';
  // corner + col headers
  cells += `<div class="ww-corner"></div>`;
  colZones.forEach(z => { cells += `<div class="ww-col">${z}</div>`; });

  SIG_ROWS.forEach(row => {
    cells += `<div class="ww-row">${row}</div>`;
    SIG_COLS.forEach(col => {
      const a = sigAssignments.find(x => x.wristband_row === row && x.wristband_col === col);
      if (!a) { cells += '<div class="ww-cell ww-empty"></div>'; return; }
      const cf   = SIG_COLORS[sigColorForRow(page, row)]?.hex || '#888';
      const play = plays.find(p => String(p.id) === String(a.play_id));
      const name = a.is_dummy ? '—' : (play ? play.name : '???');
      const abbr = name.length > 14 ? name.slice(0,13)+'…' : name;
      cells += `<div class="ww-cell" style="border-left:3px solid ${cf};${a.is_dummy?'opacity:.45;':''}">
        <span class="ww-id">${sigCellId(row,col)}</span>
        <span class="ww-name">${abbr}</span>
      </div>`;
    });
  });

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>QB Wristband Insert</title>
<style>
@page{size:4.25in 2.75in landscape;margin:.1in;}
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:Arial,Helvetica,sans-serif;background:#fff;color:#000;width:4.05in;height:2.55in;overflow:hidden;}
.ww-outer{display:flex;flex-direction:column;height:2.55in;}
.ww-top{background:#111;color:#fff;padding:2px 8px;font-size:8pt;font-weight:700;letter-spacing:1px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;}
.ww-top .rot{color:#f0a500;font-size:7pt;}
.ww-grid{display:grid;grid-template-columns:16px repeat(4,1fr);grid-template-rows:12px repeat(4,1fr);flex:1;border:2px solid #111;}
.ww-corner,.ww-col{background:#222;color:#fff;font-size:7pt;font-weight:700;text-align:center;display:flex;align-items:center;justify-content:center;border-right:1px solid #444;border-bottom:1px solid #444;}
.ww-row{background:#222;color:#fff;font-size:8pt;font-weight:700;display:flex;align-items:center;justify-content:center;border-right:1px solid #444;border-bottom:1px solid #333;}
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
  <div class="ww-bot"><span>${serLbl}</span><span>Wylie's Play Maker</span></div>
</div>
</body></html>`;

  return html;
}
