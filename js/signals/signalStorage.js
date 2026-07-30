'use strict';

// ============================================================================
// Signal / Wristband storage layer.
//
// Backed by the real relational schema (wristbands -> wristband_pages ->
// wristband_calls -> signal_assignments), team-scoped via RLS. app.html is
// sign-in gated and ensureTeamContext() guarantees currentTeamId is set
// before this module's functions are called, so there is no anonymous/local
// fallback path here -- if a call fails, it fails loudly (setStatus) rather
// than silently degrading to a per-browser copy that quietly stops syncing.
//
// A wristband has N pages (wristband_pages), each an independent 4x4 grid
// (rows A-D x cols 1-4). A page is colored one of two ways:
//   - color_family set  -> the whole page is one solid color
//   - color_family null -> row_colors {"A":"green",...} colors each row
// Cell contents live in wristband_calls (one row per occupied cell, unique
// on (wristband_page_id, call_number)), each optionally pointing at a
// signal_assignments row that holds the actual body-zone/finger encoding.
// ============================================================================

const SIG_DEFAULT_PAGES = [
  { page_number: 1, label: 'GREEN', color_family: 'green' },
  { page_number: 2, label: 'BLUE',  color_family: 'blue'  },
  { page_number: 3, label: 'RED',   color_family: 'red'   },
  { page_number: 4, label: 'GOLD',  color_family: 'gold'  },
];

// ── Wristband (one per team) ────────────────────────────────────
async function sigEnsureWristband() {
  if (!currentTeamId) throw new Error('No team context yet — sign-in did not finish setting up your team.');

  const { data: existing, error: findErr } = await supa
    .from('wristbands')
    .select('id')
    .eq('team_id', currentTeamId)
    .limit(1);
  if (findErr) throw findErr;
  if (existing && existing.length) return existing[0].id;

  const { data: created, error: createErr } = await supa
    .from('wristbands')
    .insert({ team_id: currentTeamId, name: 'Wristband', columns: 4 })
    .select('id')
    .single();
  if (createErr) throw createErr;
  return created.id;
}

// ── Pages ────────────────────────────────────────────────────────
async function sigLoadPages(wristbandId) {
  const { data: existing, error: findErr } = await supa
    .from('wristband_pages')
    .select('*')
    .eq('wristband_id', wristbandId)
    .order('page_number', { ascending: true });
  if (findErr) throw findErr;
  if (existing && existing.length) return existing;

  // First time this wristband has been opened -- bootstrap the 4 standard
  // color pages so there's always something to assign plays to.
  const rows = SIG_DEFAULT_PAGES.map(p => ({ wristband_id: wristbandId, ...p }));
  const { data: created, error: createErr } = await supa
    .from('wristband_pages')
    .insert(rows)
    .select('*')
    .order('page_number', { ascending: true });
  if (createErr) throw createErr;
  return created;
}

async function sigUpdatePage(pageId, patch) {
  const { data, error } = await supa
    .from('wristband_pages')
    .update(patch)
    .eq('id', pageId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

// ── Calls (occupied cells) for a page ───────────────────────────
async function sigLoadCalls(pageId) {
  const { data, error } = await supa
    .from('wristband_calls')
    .select('*, signal_assignments(*)')
    .eq('wristband_page_id', pageId);
  if (error) throw error;
  // Flatten: row -> col are derived from call_number (e.g. "B3"), the
  // signal encoding lives in the joined signal_assignments row.
  return (data || []).map(row => {
    const cellId = row.call_number || '';
    const sig = row.signal_assignments || {};
    const sd = sig.signal_data || {};
    return {
      id: row.id,
      wristband_row: cellId.slice(0, 1),
      wristband_col: Number(cellId.slice(1)),
      play_id: row.play_id,
      signal_id: row.signal_id,
      is_dummy: sig.signal_type === 'dummy',
      signal_body_zone: sd.body_zone,
      signal_fingers: sd.fingers,
      live_caller: sd.live_caller || 'OC',
      series_rotation: sd.series_rotation ?? 0,
    };
  });
}

// ── Save (create or overwrite) one cell ─────────────────────────
async function sigSaveCell(pageId, row, col, candidate) {
  const cellId = row + col;
  const signalData = {
    body_zone: candidate.signal_body_zone,
    fingers: candidate.signal_fingers,
    live_caller: candidate.live_caller || 'OC',
    series_rotation: candidate.series_rotation ?? 0,
  };

  // Look up any existing call in this exact cell so its old signal_assignments
  // row can be replaced rather than orphaned.
  const { data: existingCall, error: findErr } = await supa
    .from('wristband_calls')
    .select('id, signal_id')
    .eq('wristband_page_id', pageId)
    .eq('call_number', cellId)
    .maybeSingle();
  if (findErr) throw findErr;

  const { data: newSignal, error: sigErr } = await supa
    .from('signal_assignments')
    .insert({
      team_id: currentTeamId,
      play_id: candidate.is_dummy ? null : candidate.play_id,
      call_number: cellId,
      signal_type: candidate.is_dummy ? 'dummy' : 'body_zone',
      signal_data: signalData,
    })
    .select('id')
    .single();
  if (sigErr) throw sigErr;

  const { data: savedCall, error: callErr } = await supa
    .from('wristband_calls')
    .upsert({
      id: existingCall?.id,
      wristband_page_id: pageId,
      play_id: candidate.is_dummy ? null : candidate.play_id,
      call_number: cellId,
      signal_id: newSignal.id,
      sort_order: (row.charCodeAt(0) - 65) * 4 + (col - 1),
    }, { onConflict: 'wristband_page_id,call_number' })
    .select('id')
    .single();
  if (callErr) throw callErr;

  // Now that the call points at the new signal row, the old one (if any)
  // is safely orphaned and can be removed.
  if (existingCall?.signal_id && existingCall.signal_id !== newSignal.id) {
    await supa.from('signal_assignments').delete().eq('id', existingCall.signal_id);
  }

  return { id: savedCall.id, signal_id: newSignal.id };
}

// ── Clear one cell ───────────────────────────────────────────────
async function sigDeleteCell(pageId, row, col) {
  const cellId = row + col;
  const { data: existingCall, error: findErr } = await supa
    .from('wristband_calls')
    .select('id, signal_id')
    .eq('wristband_page_id', pageId)
    .eq('call_number', cellId)
    .maybeSingle();
  if (findErr) throw findErr;
  if (!existingCall) return;

  await supa.from('wristband_calls').delete().eq('id', existingCall.id);
  if (existingCall.signal_id) {
    await supa.from('signal_assignments').delete().eq('id', existingCall.signal_id);
  }
}
