'use strict';

// ============================================================================
// Team Dashboard — what a signed-in coach sees on the Home tab: their team
// name, the season's game schedule (with scores + notes), and quick links
// into the rest of the app. Backed by teams / seasons / opponents, all
// scoped via currentTeamId / currentSeasonId (set in ensureTeamContext()).
// ============================================================================

let _dashGames = [];
let _dashEditingGameId = null;

async function renderTeamDashboard() {
  const banner = document.getElementById('dash-team-error');
  if (!currentTeamId) {
    // Three distinct states share this one "no team yet" banner, and
    // conflating them was the root of the invite-code bug: a coach who
    // hasn't picked Create-vs-Join yet (teamContextNeedsSetup) is NOT in
    // an error state, so showing them "Couldn't set up your team" (or a
    // Retry button that has nothing to actually retry) reads as broken
    // when it's really just an unmade choice.
    console.warn('[renderTeamDashboard] no team context yet:', teamContextError, '| needsSetup:', teamContextNeedsSetup);
    if (banner) {
      banner.style.display = 'flex';
      const retryBtn = banner.querySelector('.dash-retry-btn');
      if (teamContextNeedsSetup) {
        banner.querySelector('.dash-error-msg').textContent =
          "You're not on a team yet — create one, or enter the invite code your head coach gave you.";
        if (retryBtn) retryBtn.style.display = 'none';
      } else {
        banner.querySelector('.dash-error-msg').textContent = teamContextError
          ? `Couldn't set up your team: ${teamContextError}`
          : 'Setting up your team…';
        if (retryBtn) retryBtn.style.display = '';
      }
    }
    return;
  }
  if (banner) banner.style.display = 'none';
  await Promise.all([loadDashTeamName(), loadDashSeasonLabel(), loadDashGames()]);
}

async function loadDashTeamName() {
  const input = document.getElementById('dash-team-name');
  if (!input) return;
  // supabase-js serializes a JS `null` filter value as the literal string
  // "null" in the query string (?id=eq.null), which Postgres then rejects
  // with "invalid input syntax for type uuid" instead of matching nothing.
  // Bail out before firing a request that's guaranteed to fail.
  if (!currentTeamId) return;
  const { data, error } = await supa.from('teams').select('name').eq('id', currentTeamId).single();
  if (error) { console.error('[loadDashTeamName] failed:', error.message); return; }
  input.value = data?.name || '';
}

async function saveDashTeamName() {
  const input = document.getElementById('dash-team-name');
  const badge = document.getElementById('dash-team-save-badge');
  const name = (input.value || '').trim();
  if (!name) { input.value = input.defaultValue || 'My Team'; return; }
  if (!currentTeamId) { setStatus("Your team isn't set up yet — try Retry above, or reload the page.", 'err'); return; }
  const { error } = await supa.from('teams').update({ name }).eq('id', currentTeamId);
  if (error) { console.error('[saveDashTeamName] failed:', error.message); setStatus('Could not save team name — ' + error.message); return; }
  if (badge) {
    badge.textContent = 'SAVED';
    badge.classList.add('show');
    setTimeout(() => badge.classList.remove('show'), 1500);
  }
}

async function loadDashSeasonLabel() {
  const el = document.getElementById('dash-season-label');
  if (!el || !currentSeasonId) return;
  const { data, error } = await supa.from('seasons').select('name').eq('id', currentSeasonId).single();
  if (error) { console.error('[loadDashSeasonLabel] failed:', error.message); return; }
  el.textContent = data?.name || '';
}

// ── Games ────────────────────────────────────────────────────
async function loadDashGames() {
  const { data, error } = await supa
    .from('opponents')
    .select('*')
    .eq('team_id', currentTeamId)
    .eq('season_id', currentSeasonId)
    .order('game_date', { ascending: true, nullsFirst: false });
  if (error) { console.error('[loadDashGames] failed:', error.message); setStatus('Could not load schedule — ' + error.message); return; }
  _dashGames = data || [];
  renderDashGamesList();
}

function dashFormatDateBadge(dateStr) {
  if (!dateStr) return { month: '—', day: '—' };
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return {
    month: dt.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: String(d).padStart(2, '0'),
  };
}

function dashScoreInfo(g) {
  if (g.our_score == null || g.opponent_score == null) {
    return { text: 'TBD', cls: 'tbd', result: '' };
  }
  const text = `${g.our_score}–${g.opponent_score}`;
  if (g.our_score > g.opponent_score) return { text, cls: 'win', result: 'WIN' };
  if (g.our_score < g.opponent_score) return { text, cls: 'loss', result: 'LOSS' };
  return { text, cls: 'tie', result: 'TIE' };
}

function renderDashGamesList() {
  const wrap = document.getElementById('dash-games-list');
  if (!wrap) return;
  if (!_dashGames.length) {
    wrap.innerHTML = '<div class="dash-games-empty">No games on the schedule yet — add your first game.</div>';
    return;
  }
  wrap.innerHTML = '';
  _dashGames.forEach(g => {
    const badge = dashFormatDateBadge(g.game_date);
    const score = dashScoreInfo(g);
    const row = document.createElement('div');
    row.className = 'game-row';
    row.onclick = () => openGameModal(g.id);
    row.innerHTML = `
      <div class="game-row-date"><span class="gd-month">${badge.month}</span><span class="gd-day">${badge.day}</span></div>
      <div class="game-row-main">
        <div class="game-row-opp"></div>
        <div class="game-row-meta">
          <span class="game-row-loc ${g.location || 'home'}">${(g.location || 'home').toUpperCase()}</span>
          ${g.notes ? `<span class="game-row-notes"></span>` : ''}
        </div>
      </div>
      <div class="game-row-score ${score.cls}">${score.text}${score.result ? `<span class="gs-result">${score.result}</span>` : ''}</div>
    `;
    row.querySelector('.game-row-opp').textContent = g.name || 'Opponent TBD';
    const notesEl = row.querySelector('.game-row-notes');
    if (notesEl) notesEl.textContent = g.notes;
    wrap.appendChild(row);
  });
}

// ── Add / edit / delete modal ──────────────────────────────────
function openGameModal(gameId) {
  _dashEditingGameId = gameId || null;
  const g = gameId ? _dashGames.find(x => x.id === gameId) : null;

  document.getElementById('game-modal-title').textContent = g ? 'EDIT GAME' : 'ADD GAME';
  document.getElementById('game-name').value = g?.name || '';
  document.getElementById('game-date').value = g?.game_date || '';
  document.getElementById('game-location').value = g?.location || 'home';
  document.getElementById('game-our-score').value = g?.our_score ?? '';
  document.getElementById('game-opp-score').value = g?.opponent_score ?? '';
  document.getElementById('game-notes').value = g?.notes || '';
  document.getElementById('game-modal-err').textContent = '';
  document.getElementById('game-delete-btn').style.display = g ? 'block' : 'none';

  document.getElementById('game-modal').classList.add('show');
}

function closeGameModal() {
  document.getElementById('game-modal').classList.remove('show');
  _dashEditingGameId = null;
}

async function saveGameFromModal() {
  const name = document.getElementById('game-name').value.trim();
  const errEl = document.getElementById('game-modal-err');
  if (!name) { errEl.textContent = 'Enter an opponent name.'; return; }
  if (!currentTeamId) { errEl.textContent = "Your team isn't set up yet — close this, hit Retry on the dashboard, then try again."; return; }

  const ourScoreRaw = document.getElementById('game-our-score').value;
  const oppScoreRaw = document.getElementById('game-opp-score').value;

  const row = {
    team_id: currentTeamId,
    season_id: currentSeasonId,
    name,
    game_date: document.getElementById('game-date').value || null,
    location: document.getElementById('game-location').value,
    our_score: ourScoreRaw === '' ? null : parseInt(ourScoreRaw),
    opponent_score: oppScoreRaw === '' ? null : parseInt(oppScoreRaw),
    notes: document.getElementById('game-notes').value.trim() || null,
  };

  let error;
  if (_dashEditingGameId) {
    ({ error } = await supa.from('opponents').update(row).eq('id', _dashEditingGameId));
  } else {
    ({ error } = await supa.from('opponents').insert(row));
  }
  if (error) { errEl.textContent = 'Save failed — ' + error.message; return; }

  closeGameModal();
  await loadDashGames();
  setStatus(`"${name}" saved to your schedule`);
}

async function deleteGameFromModal() {
  if (!_dashEditingGameId) return;
  const { error } = await supa.from('opponents').delete().eq('id', _dashEditingGameId);
  if (error) { document.getElementById('game-modal-err').textContent = 'Delete failed — ' + error.message; return; }
  closeGameModal();
  await loadDashGames();
}

// ── Team Coaches (invite code + roster) ─────────────────────────
// join_team_by_code / regenerate_team_invite_code / get_team_roster are
// all SECURITY DEFINER RPCs (see the team_invite_codes_and_roster
// migration) -- profiles and auth.users are both locked to self-only
// RLS, so get_team_roster() is the only way a coach can see teammate
// names/emails at all, and the other two need to validate/mutate things
// (an invite code match, team ownership) that a plain client-side query
// has no safe way to check on its own.
let _teamRoster = [];

function openTeamCoachesModal() {
  if (!currentTeamId) { setStatus("Your team isn't set up yet — close this and hit Retry on the dashboard.", 'err'); return; }
  document.getElementById('tc-err').textContent = '';
  document.getElementById('tc-owner-panel').style.display = currentTeamRole === 'owner' ? 'block' : 'none';
  document.getElementById('tc-leave-btn').style.display = currentTeamRole === 'owner' ? 'none' : 'flex';
  document.getElementById('tc-invite-code').textContent = '——————';
  document.getElementById('team-coaches-modal').classList.add('show');
  loadTeamCoachesPanel();
}

function closeTeamCoachesModal() {
  document.getElementById('team-coaches-modal').classList.remove('show');
}

async function loadTeamCoachesPanel() {
  const errEl = document.getElementById('tc-err');
  try {
    if (currentTeamRole === 'owner') {
      const { data: team, error: teamErr } = await supa.from('teams').select('invite_code').eq('id', currentTeamId).single();
      if (teamErr) throw teamErr;
      document.getElementById('tc-invite-code').textContent = team?.invite_code || '——————';
    }
    const { data: roster, error: rosterErr } = await supa.rpc('get_team_roster', { p_team_id: currentTeamId });
    if (rosterErr) throw rosterErr;
    _teamRoster = roster || [];
    renderTeamRoster();
  } catch (e) {
    errEl.textContent = 'Could not load — ' + (e.message || 'unknown error');
    console.error('[loadTeamCoachesPanel] failed:', e);
  }
}

function renderTeamRoster() {
  const wrap = document.getElementById('tc-roster-list');
  if (!wrap) return;
  if (!_teamRoster.length) {
    wrap.innerHTML = '<div class="tc-roster-empty">No coaches yet.</div>';
    return;
  }
  wrap.innerHTML = '';
  _teamRoster.forEach(m => {
    const row = document.createElement('div');
    row.className = 'tc-roster-row';
    const canRemove = currentTeamRole === 'owner' && m.role !== 'owner' && m.user_id !== currentUser?.id;
    row.innerHTML = `
      <div class="tc-roster-info">
        <div class="tc-roster-name"></div>
        <div class="tc-roster-email"></div>
      </div>
      <span class="tc-roster-role ${m.role}">${m.role.toUpperCase()}</span>
      ${canRemove ? `<button class="tc-roster-remove" title="Remove from team">✕</button>` : ''}
    `;
    row.querySelector('.tc-roster-name').textContent = m.display_name || (m.email ? m.email.split('@')[0] : 'Coach');
    row.querySelector('.tc-roster-email').textContent = m.email || '';
    const removeBtn = row.querySelector('.tc-roster-remove');
    if (removeBtn) removeBtn.onclick = () => removeTeamMember(m.user_id, m.display_name || m.email || 'this coach');
    wrap.appendChild(row);
  });
}

function copyInviteCode() {
  const code = document.getElementById('tc-invite-code').textContent.trim();
  if (!code || code === '——————') return;
  navigator.clipboard?.writeText(code)
    .then(() => setStatus('Invite code copied', 'ok'))
    .catch(() => setStatus('Could not copy — select and copy the code manually.', 'err'));
}

async function regenerateInviteCode() {
  if (!confirm('Generate a new invite code? The old code will stop working immediately.')) return;
  const errEl = document.getElementById('tc-err');
  try {
    const { data: newCode, error } = await supa.rpc('regenerate_team_invite_code', { p_team_id: currentTeamId });
    if (error) throw error;
    document.getElementById('tc-invite-code').textContent = newCode;
    setStatus('New invite code generated', 'ok');
  } catch (e) {
    errEl.textContent = 'Could not regenerate — ' + (e.message || 'unknown error');
  }
}

// Owner removing a coach, or a coach removing themself, both go through
// the same DELETE -- team_members' RLS policy already allows either
// (is_team_owner(team_id) OR user_id = auth.uid()), so there's no need
// for a dedicated RPC here the way join/regenerate need one.
async function removeTeamMember(userId, label) {
  if (!confirm(`Remove ${label} from this team?`)) return;
  const errEl = document.getElementById('tc-err');
  try {
    const { error } = await supa.from('team_members').delete().eq('team_id', currentTeamId).eq('user_id', userId);
    if (error) throw error;
    setStatus(`${label} removed from the team`, 'ok');
    await loadTeamCoachesPanel();
  } catch (e) {
    errEl.textContent = 'Could not remove — ' + (e.message || 'unknown error');
  }
}

async function leaveCurrentTeam() {
  if (!confirm("Leave this team? You'll need a new invite code to rejoin.")) return;
  try {
    const { error } = await supa.from('team_members').delete().eq('team_id', currentTeamId).eq('user_id', currentUser.id);
    if (error) throw error;
    closeTeamCoachesModal();
    currentTeamId = null;
    currentTeamRole = null;
    currentSeasonId = null;
    teamContextError = null;
    setStatus("You've left the team.", 'ok');
    renderTeamDashboard();
  } catch (e) {
    document.getElementById('tc-err').textContent = 'Could not leave — ' + (e.message || 'unknown error');
  }
}

// ── Team Branding (colors + logo) ────────────────────────────────
// teams.primary_color/secondary_color/logo_url already existed in the
// schema but had no UI anywhere and were never read by any print
// template -- every printout looked anonymous (or, on the wristband
// insert, was hardcoded to the app's own name instead of the team's).
// getTeamBranding()/buildPrintBrandingHeader() (js/printPreview.js) are
// what actually consume these values at print time.
const TB_LOGO_BUCKET = 'team-logos';
const TB_MAX_LOGO_BYTES = 2 * 1024 * 1024;
const TB_ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

function openTeamBrandingModal() {
  if (!currentTeamId) { setStatus("Your team isn't set up yet — close this and hit Retry on the dashboard.", 'err'); return; }
  document.getElementById('tb-err').textContent = '';
  // teams_update RLS is owner-only (matches the rest of the team's
  // identity fields -- name, mascot, etc.), so a coach can see branding
  // here but not change it, rather than clicking Save and hitting a
  // confusing permission error.
  const isOwner = currentTeamRole === 'owner';
  document.getElementById('tb-logo-upload-label').style.display = isOwner ? 'inline-flex' : 'none';
  document.getElementById('tb-primary-color').disabled = !isOwner;
  document.getElementById('tb-secondary-color').disabled = !isOwner;
  document.getElementById('tb-save-btn').style.display = isOwner ? 'block' : 'none';
  document.getElementById('tb-readonly-note').style.display = isOwner ? 'none' : 'block';
  document.getElementById('team-branding-modal').classList.add('show');
  loadTeamBrandingIntoModal();
}

function closeTeamBrandingModal() {
  document.getElementById('team-branding-modal').classList.remove('show');
}

async function loadTeamBrandingIntoModal() {
  const errEl = document.getElementById('tb-err');
  try {
    const { data, error } = await supa
      .from('teams')
      .select('primary_color, secondary_color, logo_url')
      .eq('id', currentTeamId)
      .single();
    if (error) throw error;
    document.getElementById('tb-primary-color').value = data?.primary_color || '#0B2545';
    document.getElementById('tb-secondary-color').value = data?.secondary_color || '#F4B400';
    renderTeamLogoPreview(data?.logo_url || null);
  } catch (e) {
    errEl.textContent = 'Could not load — ' + (e.message || 'unknown error');
  }
}

function renderTeamLogoPreview(logoUrl) {
  const preview = document.getElementById('tb-logo-preview');
  const removeBtn = document.getElementById('tb-logo-remove-btn');
  const isOwner = currentTeamRole === 'owner';
  if (logoUrl) {
    preview.innerHTML = `<img src="${logoUrl}" alt="Team logo">`;
    removeBtn.style.display = isOwner ? 'block' : 'none';
  } else {
    preview.innerHTML = '<span id="tb-logo-placeholder">No logo</span>';
    removeBtn.style.display = 'none';
  }
}

async function saveTeamBrandingColors() {
  const errEl = document.getElementById('tb-err');
  const btn = document.getElementById('tb-save-btn');
  const primary = document.getElementById('tb-primary-color').value;
  const secondary = document.getElementById('tb-secondary-color').value;
  errEl.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Saving…';
  try {
    const { error } = await supa.from('teams')
      .update({ primary_color: primary, secondary_color: secondary })
      .eq('id', currentTeamId);
    if (error) throw error;
    setStatus('Team colors saved', 'ok');
  } catch (e) {
    errEl.textContent = 'Could not save — ' + (e.message || 'unknown error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Colors';
  }
}

async function handleTeamLogoSelect(event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  const errEl = document.getElementById('tb-err');
  errEl.textContent = '';

  // Client-side checks are just fast feedback -- the team-logos bucket
  // itself enforces the real size/type limits server-side (see the
  // team_logos_storage_bucket migration), so a request that slips past
  // this still can't succeed with something outside those bounds.
  if (!TB_ALLOWED_LOGO_TYPES.includes(file.type)) {
    errEl.textContent = 'Please choose a PNG, JPG, or WEBP image.';
    return;
  }
  if (file.size > TB_MAX_LOGO_BYTES) {
    errEl.textContent = 'That image is too large — please choose one under 2MB.';
    return;
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${currentTeamId}/logo.${ext}`;

  try {
    const { error: uploadErr } = await supa.storage
      .from(TB_LOGO_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });
    if (uploadErr) throw uploadErr;

    const { data: pub } = supa.storage.from(TB_LOGO_BUCKET).getPublicUrl(path);
    // Cache-bust so re-uploading a logo at the same path shows up
    // immediately instead of an old cached copy at the identical URL.
    const logoUrl = `${pub.publicUrl}?t=${Date.now()}`;

    const { error: updateErr } = await supa.from('teams').update({ logo_url: logoUrl }).eq('id', currentTeamId);
    if (updateErr) throw updateErr;

    renderTeamLogoPreview(logoUrl);
    setStatus('Logo uploaded', 'ok');
  } catch (e) {
    errEl.textContent = 'Upload failed — ' + (e.message || 'unknown error');
  }
}

async function removeTeamLogo() {
  if (!confirm('Remove your team logo?')) return;
  const errEl = document.getElementById('tb-err');
  try {
    const { error } = await supa.from('teams').update({ logo_url: null }).eq('id', currentTeamId);
    if (error) throw error;
    renderTeamLogoPreview(null);
    setStatus('Logo removed', 'ok');
  } catch (e) {
    errEl.textContent = 'Could not remove — ' + (e.message || 'unknown error');
  }
}
