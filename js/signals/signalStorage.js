'use strict';

const SIG_LOCAL_KEY = 'wfpm_signal_assignments';

// ── localStorage helpers ──────────────────────────────────────
function sigLocalGet() {
  try { return JSON.parse(localStorage.getItem(SIG_LOCAL_KEY) || '[]'); }
  catch { return []; }
}
function sigLocalSet(arr) {
  try { localStorage.setItem(SIG_LOCAL_KEY, JSON.stringify(arr)); } catch(e) {}
}

function sigGenId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ── Load all assignments ──────────────────────────────────────
// Tries Supabase first when signed in, falls back to localStorage.
async function sigLoadAll() {
  if (typeof currentUser !== 'undefined' && currentUser) {
    try {
      const { data, error } = await supa
        .from('signal_assignments')
        .select('*')
        .order('created_at', { ascending: true });
      if (!error && data) {
        sigLocalSet(data); // keep local copy in sync
        return data;
      }
    } catch(e) { console.warn('Signal Supabase load failed, using local:', e.message); }
  }
  return sigLocalGet();
}

// ── Upsert a single assignment ────────────────────────────────
async function sigSaveOne(assignment) {
  if (!assignment.id) assignment.id = sigGenId();
  if (!assignment.created_at) assignment.created_at = new Date().toISOString();

  if (typeof currentUser !== 'undefined' && currentUser) {
    try {
      const row = { ...assignment, coach_id: currentUser.id };
      const { error } = await supa
        .from('signal_assignments')
        .upsert(row, { onConflict: 'id' });
      if (!error) {
        _sigLocalUpsert(assignment);
        return assignment;
      }
    } catch(e) { console.warn('Signal Supabase save failed, using local:', e.message); }
  }
  _sigLocalUpsert(assignment);
  return assignment;
}

// ── Delete one assignment by id ───────────────────────────────
async function sigDeleteOne(id) {
  if (typeof currentUser !== 'undefined' && currentUser) {
    try {
      await supa.from('signal_assignments').delete().eq('id', id);
    } catch(e) { console.warn('Signal Supabase delete failed:', e.message); }
  }
  sigLocalSet(sigLocalGet().filter(x => x.id !== id));
}

function _sigLocalUpsert(assignment) {
  const arr = sigLocalGet();
  const idx = arr.findIndex(x => x.id === assignment.id);
  if (idx >= 0) arr[idx] = assignment; else arr.push(assignment);
  sigLocalSet(arr);
}
