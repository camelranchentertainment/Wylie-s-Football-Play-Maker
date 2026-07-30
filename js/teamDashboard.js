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
  if (!currentTeamId) {
    console.warn('[renderTeamDashboard] no team context yet');
    return;
  }
  await Promise.all([loadDashTeamName(), loadDashSeasonLabel(), loadDashGames()]);
}

async function loadDashTeamName() {
  const input = document.getElementById('dash-team-name');
  if (!input) return;
  const { data, error } = await supa.from('teams').select('name').eq('id', currentTeamId).single();
  if (error) { console.error('[loadDashTeamName] failed:', error.message); return; }
  input.value = data?.name || '';
}

async function saveDashTeamName() {
  const input = document.getElementById('dash-team-name');
  const badge = document.getElementById('dash-team-save-badge');
  const name = (input.value || '').trim();
  if (!name) { input.value = input.defaultValue || 'My Team'; return; }
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
