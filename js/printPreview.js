'use strict';

// ============================================================================
// Shared print preview, used by the wristband insert, the signal key card,
// and coach's play sheets instead of jumping straight to window.print() on
// a popup window. Shows the actual generated document in an iframe first;
// for documents where paper size is a real choice (play sheets — the
// wristband insert and key card are fixed physical formats) a size picker
// re-renders the preview before printing.
// ============================================================================

const PP_PREFS_KEY = 'wfpm_print_prefs';

function ppLoadPrefs() {
  try { return JSON.parse(localStorage.getItem(PP_PREFS_KEY) || '{}'); }
  catch { return {}; }
}
function ppSavePrefs(patch) {
  const prefs = { ...ppLoadPrefs(), ...patch };
  try { localStorage.setItem(PP_PREFS_KEY, JSON.stringify(prefs)); } catch {}
  return prefs;
}

// buildFn(paperSize) -> html string. Called once up front, and again
// whenever the paper size selector changes (only shown if opts.paperSize).
let _ppBuildFn = null;

function showPrintPreview(buildFn, opts = {}) {
  _ppBuildFn = buildFn;
  document.getElementById('pp-title').textContent = opts.title || 'Print Preview';

  const sizeRow = document.getElementById('pp-size-row');
  const sizeSel = document.getElementById('pp-size-sel');
  if (opts.paperSize) {
    sizeRow.style.display = 'flex';
    const saved = ppLoadPrefs().paperSize || 'letter-portrait';
    sizeSel.value = saved;
  } else {
    sizeRow.style.display = 'none';
  }

  ppRender();
  document.getElementById('print-preview-modal').classList.add('show');
}

function ppRender() {
  const sizeSel = document.getElementById('pp-size-sel');
  const size = sizeSel && document.getElementById('pp-size-row').style.display !== 'none'
    ? sizeSel.value
    : null;
  const frame = document.getElementById('print-preview-frame');
  frame.srcdoc = _ppBuildFn(size);
}

function ppOnSizeChange() {
  ppSavePrefs({ paperSize: document.getElementById('pp-size-sel').value });
  ppRender();
}

function closePrintPreview() {
  document.getElementById('print-preview-modal').classList.remove('show');
  _ppBuildFn = null;
}

function doPrintPreview() {
  const frame = document.getElementById('print-preview-frame');
  try {
    frame.contentWindow.focus();
    frame.contentWindow.print();
  } catch (e) {
    console.error('[doPrintPreview] failed:', e);
    setStatus('Could not open the print dialog — try again.');
  }
}
