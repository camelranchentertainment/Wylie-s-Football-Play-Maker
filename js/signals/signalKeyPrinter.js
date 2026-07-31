'use strict';

async function printSigKeyCard() {
  if (!sigAssignments.length) { alert('No signals assigned yet.'); return; }

  const page = sigActivePage();
  const branding = await getTeamBranding();
  showPrintPreview(() => buildSigKeyCardHtml(branding), { title: (page?.label || 'SIGNAL KEY') + ' — Coach Reference' });
}

// Fixed physical card size (5.5in x 4.25in) -- no paper-size picker.
function buildSigKeyCardHtml(branding) {
  const page   = sigActivePage();
  const real   = sigAssignments.filter(a => !a.is_dummy && a.play_id)
    .sort((a,b) => SIG_ROWS.indexOf(a.wristband_row)*4+(a.wristband_col-1)
                 - SIG_ROWS.indexOf(b.wristband_row)*4-(b.wristband_col-1));
  const dummies = sigAssignments.filter(a => a.is_dummy);

  const rotNote = sigRotation > 0
    ? `<div class="kc-rot">ROTATION +${sigRotation} ACTIVE — row/body-part mapping shifted by ${sigRotation}</div>` : '';

  let rows = '';
  real.forEach(a => {
    // a.play_name is joined straight from the plays table (sigLoadCalls) --
    // matching against the client-side Team Library array here used to
    // always fail since a.play_id is the materialized cloud play's real
    // id, not a client-side id, rendering every play as "???".
    const name  = a.play_name || '???';
    const rowColor = sigColorForRow(page, a.wristband_row);
    const cf    = SIG_COLORS[rowColor]?.hex || '#888';
    const dZone = sigRotateZone(a.signal_body_zone, sigRotation);
    const ser   = a.series_rotation === 0 ? 'All' : `Q${a.series_rotation}`;
    const caller= a.live_caller || 'OC';
    rows += `<tr>
      <td class="kc-cell-id">${sigCellId(a.wristband_row, a.wristband_col)}</td>
      <td>${SIG_ZONE_LABELS[dZone]}</td>
      <td class="kc-ctr">${a.signal_fingers}</td>
      <td><span class="kc-dot" style="background:${cf}"></span>${SIG_COLORS[rowColor]?.label || ''}</td>
      <td><strong>${name}</strong></td>
      <td class="kc-ctr">${ser}</td>
      <td class="kc-ctr">${caller}</td>
    </tr>`;
  });

  let dummySection = '';
  if (dummies.length) {
    const items = dummies.map(a => {
      const dz = sigRotateZone(a.signal_body_zone, sigRotation);
      return `<span class="kc-dummy-chip">${sigCellId(a.wristband_row,a.wristband_col)}: ${SIG_ZONE_LABELS[dz]} &middot; ${a.signal_fingers}f</span>`;
    }).join('');
    dummySection = `<div class="kc-dummy-section"><strong>Decoy Signals</strong> ${items}</div>`;
  }

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Signal Key Card</title>
<style>
@page{size:5.5in 4.25in;margin:.25in;}
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:Arial,Helvetica,sans-serif;font-size:9pt;background:#fff;color:#000;}
.kc-title{font-size:14pt;font-weight:700;text-align:center;border-bottom:2px solid #000;padding-bottom:4px;margin-bottom:4px;letter-spacing:1px;}
.kc-sub{font-size:8pt;color:#555;text-align:center;margin-bottom:6px;}
.kc-rot{background:#fff3cd;border:1px solid #f0a500;padding:3px 10px;font-size:8pt;font-weight:700;text-align:center;margin-bottom:6px;}
table{width:100%;border-collapse:collapse;font-size:8.5pt;}
th{background:#1a1a2e;color:#fff;padding:4px 7px;text-align:left;font-size:8pt;letter-spacing:.5px;}
td{padding:4px 7px;border-bottom:1px solid #ddd;}
tr:nth-child(even) td{background:#f8f8f8;}
.kc-cell-id{font-weight:700;font-size:12pt;text-align:center;width:32px;}
.kc-ctr{text-align:center;}
.kc-dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:4px;vertical-align:middle;}
.kc-dummy-section{margin-top:12px;border-top:1px solid #ccc;padding-top:8px;font-size:8pt;color:#555;}
.kc-dummy-chip{display:inline-block;background:#f0f0f0;border-radius:4px;padding:2px 8px;margin:2px;font-style:italic;}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}.kc-dot{border:1.5px solid #000;background:transparent!important;}}
</style></head><body>
${buildPrintBrandingHeader(branding)}
<div class="kc-title">${sigEsc(page?.label || "SIGNAL KEY")} — COACH REFERENCE</div>
<div class="kc-sub">Body Zone &rarr; Row (fixed) &nbsp;·&nbsp; Fingers &rarr; Column &nbsp;·&nbsp; Read cell at intersection on wristband</div>
${rotNote}
<table>
  <thead><tr><th>Cell</th><th>Body Zone</th><th>Fingers</th><th>Color</th><th>Play</th><th>Series</th><th>Caller</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
${dummySection}
</body></html>`;

  return html;
}
