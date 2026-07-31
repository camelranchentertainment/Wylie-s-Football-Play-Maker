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

// Default size choices for documents that print to a normal page (play
// sheets, install sheets/packet, playbook). Physical-card documents
// (wristband insert) pass their own opts.sizeOptions instead -- see
// PP_WRISTBAND_SIZE_OPTIONS in wristbandPrinter.js.
const PP_PAPER_OPTIONS = [
  { value: 'letter-portrait', label: 'Letter — Portrait' },
  { value: 'letter-landscape', label: 'Letter — Landscape' },
];

// buildFn(sizeValue, customDims) -> html string, where customDims is
// {w,h} in inches (only populated when sizeValue === 'custom') and null
// otherwise. Called once up front, and again whenever the size selector
// or the custom width/height inputs change (only shown if opts.paperSize
// or opts.sizeOptions was passed to showPrintPreview()).
let _ppBuildFn = null;
let _ppSizeOptions = null;
let _ppSizePrefKey = 'paperSize';

function showPrintPreview(buildFn, opts = {}) {
  _ppBuildFn = buildFn;
  document.getElementById('pp-title').textContent = opts.title || 'Print Preview';

  const sizeRow    = document.getElementById('pp-size-row');
  const sizeSel     = document.getElementById('pp-size-sel');
  const sizeLabel   = document.getElementById('pp-size-label');
  const customRow   = document.getElementById('pp-custom-size-row');

  _ppSizeOptions = opts.sizeOptions || (opts.paperSize ? PP_PAPER_OPTIONS : null);
  _ppSizePrefKey = opts.sizePrefKey || 'paperSize';

  if (_ppSizeOptions && _ppSizeOptions.length) {
    sizeRow.style.display = 'flex';
    sizeLabel.textContent = opts.sizeLabel || 'Paper';
    sizeSel.innerHTML = _ppSizeOptions.map(o => `<option value="${o.value}">${sigEsc(o.label)}</option>`).join('');

    const prefs = ppLoadPrefs();
    const savedValue = prefs[_ppSizePrefKey];
    const validSaved = _ppSizeOptions.some(o => o.value === savedValue);
    sizeSel.value = validSaved ? savedValue : _ppSizeOptions[0].value;

    const customW = parseFloat(prefs[_ppSizePrefKey + 'CustomW']);
    const customH = parseFloat(prefs[_ppSizePrefKey + 'CustomH']);
    document.getElementById('pp-custom-w').value = Number.isFinite(customW) ? customW : 4.25;
    document.getElementById('pp-custom-h').value = Number.isFinite(customH) ? customH : 2.75;
    customRow.style.display = sizeSel.value === 'custom' ? 'flex' : 'none';
  } else {
    sizeRow.style.display = 'none';
    customRow.style.display = 'none';
  }

  ppRender();
  document.getElementById('print-preview-modal').classList.add('show');
}

// Reads the current custom width/height inputs, clamped to sane bounds
// (2-10in / 1.5-8in) so a coach fat-fingering a "0" or a stray letter
// can't hand the wristband builder a broken or negative page size.
function ppReadCustomDims() {
  const wRaw = parseFloat(document.getElementById('pp-custom-w')?.value);
  const hRaw = parseFloat(document.getElementById('pp-custom-h')?.value);
  return {
    w: (Number.isFinite(wRaw) && wRaw >= 2 && wRaw <= 10) ? wRaw : 4.25,
    h: (Number.isFinite(hRaw) && hRaw >= 1.5 && hRaw <= 8) ? hRaw : 2.75,
  };
}

function ppRender() {
  const sizeRow = document.getElementById('pp-size-row');
  const sizeSel = document.getElementById('pp-size-sel');
  const size = (_ppSizeOptions && sizeRow.style.display !== 'none') ? sizeSel.value : null;
  const customDims = size === 'custom' ? ppReadCustomDims() : null;
  const frame = document.getElementById('print-preview-frame');
  frame.srcdoc = _ppBuildFn(size, customDims);
}

function ppOnSizeChange() {
  const sizeSel = document.getElementById('pp-size-sel');
  document.getElementById('pp-custom-size-row').style.display = sizeSel.value === 'custom' ? 'flex' : 'none';
  ppSavePrefs({ [_ppSizePrefKey]: sizeSel.value });
  ppRender();
}

function ppOnCustomSizeChange() {
  const dims = ppReadCustomDims();
  ppSavePrefs({ [_ppSizePrefKey + 'CustomW']: dims.w, [_ppSizePrefKey + 'CustomH']: dims.h });
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

// ── Team branding for print headers ─────────────────────────────
// Fetched fresh (not cached) every time a print is triggered, so a
// change made in the Team Branding modal shows up on the very next
// printout without needing a page reload.
async function getTeamBranding() {
  const fallback = { name: 'My Team', primary_color: '#0B2545', secondary_color: '#F4B400', logo_url: null };
  if (!currentTeamId) return fallback;
  try {
    const { data, error } = await supa
      .from('teams')
      .select('name, primary_color, secondary_color, logo_url')
      .eq('id', currentTeamId)
      .single();
    if (error) throw error;
    return {
      name: data?.name || fallback.name,
      primary_color: data?.primary_color || fallback.primary_color,
      secondary_color: data?.secondary_color || fallback.secondary_color,
      logo_url: data?.logo_url || null,
    };
  } catch (e) {
    console.error('[getTeamBranding] failed:', e.message || e);
    return fallback;
  }
}

// Small reusable header block -- logo (if one's been uploaded) plus team
// name -- meant to sit above a print document's own title so a printed
// page never looks anonymous or (worse) branded as "Wylie's Play Maker"
// instead of the coach's own team.
function buildPrintBrandingHeader(branding) {
  if (!branding) return '';
  const logo = branding.logo_url
    ? `<img src="${branding.logo_url}" alt="" style="height:30px;width:auto;object-fit:contain;">`
    : '';
  return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
    ${logo}
    <span style="font-family:Arial,Helvetica,sans-serif;font-size:9.5pt;font-weight:700;letter-spacing:.5px;color:${sigEsc(branding.primary_color || '#333')};">${sigEsc(branding.name)}</span>
  </div>`;
}
