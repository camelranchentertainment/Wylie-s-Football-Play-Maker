export const config = { runtime: 'edge' };

// ─────────────────────────────────────────────────────────────────────────
// AI Play Builder — turns a coach's plain-English description into a
// structured play (players + routes) in the exact shape the Designer
// canvas already understands. Replaces the old free-text /api/coach
// "AI Coach" suggestions with a real, renderable play diagram.
//
// Coordinate system (yards, matches app.html's FMTNS formation data):
//   x: 0 = center of the field, negative = left, positive = right (~-26..26)
//   y: 0 = line of scrimmage
//      positive y = offensive backfield (behind the line)
//      negative y = downfield / the defense's side of the ball
// The client converts these yard coordinates to canvas pixels via yd2c().
// ─────────────────────────────────────────────────────────────────────────

// Keep in sync with the FMTNS object in app.html.
const KNOWN_FORMATIONS = {
  offense: ['Pro Set', 'I-Formation', 'Shotgun', 'Spread / Trips', 'Pistol', 'Singleback', 'Power I', 'Wildcat'],
  defense: ['4-3', '3-4', 'Nickel', 'Dime', '46 Bear', 'Cover 2', 'Zero Blitz', 'Man Coverage'],
};

const PLAY_TYPES = ['run', 'pass', 'screen', 'trick', 'redzone', 'special', 'defense'];
const ROUTE_STYLES = ['solid', 'dashed', 'motion', 'block'];
const ASSIGN_TYPES = ['rush', 'cover', 'zone', 'blitz'];

// Production custom domains always allowed. ALLOWED_ORIGIN (optional env
// var) adds one more — e.g. a staging domain — it does NOT replace this
// list. (A previous version made ALLOWED_ORIGIN exclusive, which silently
// locked the AI feature out of the real production domain because the var
// was never set — *.vercel.app previews worked, wfpmfootball.com did not.)
const KNOWN_PRODUCTION_ORIGINS = ['https://wfpmfootball.com', 'https://www.wfpmfootball.com'];

function getAllowedOrigin(req) {
  const origin = req.headers.get('origin') || '';
  if (!origin) return null;
  const extra = process.env.ALLOWED_ORIGIN;
  if (extra && origin === extra) return origin;
  if (KNOWN_PRODUCTION_ORIGINS.includes(origin)) return origin;
  if (
    origin === 'http://localhost:3000' ||
    origin === 'http://localhost:8765' ||
    /^https:\/\/[\w-]+\.vercel\.app$/.test(origin)
  ) {
    return origin;
  }
  return null;
}

function clamp(n, lo, hi, fallback) {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : fallback;
  return Math.min(hi, Math.max(lo, v));
}

function cleanStr(s, maxLen, fallback) {
  const v = (typeof s === 'string' ? s : '').trim().slice(0, maxLen);
  return v || fallback;
}

// Sanitizes the model's tool-call input into a play we trust enough to
// hand back to the client. We never assume the schema was followed
// perfectly — clamp/coerce everything, drop anything unusable.
function sanitizePlay(raw, requestedMode) {
  if (!raw || typeof raw !== 'object') return null;

  const mode = raw.mode === 'defense' ? 'defense' : raw.mode === 'offense' ? 'offense' : requestedMode;
  const type = PLAY_TYPES.includes(raw.type) ? raw.type : (mode === 'defense' ? 'defense' : 'run');
  const name = cleanStr(raw.name, 40, 'AI Play');
  const formation = cleanStr(raw.formation, 30, 'Custom');

  const rawPlayers = Array.isArray(raw.players) ? raw.players.slice(0, 11) : [];
  const players = rawPlayers
    .map((p) => {
      if (!p || typeof p !== 'object') return null;
      const pos = cleanStr(p.pos, 6, null);
      if (!pos) return null;
      return {
        pos,
        lbl: cleanStr(p.lbl, 6, pos),
        x: clamp(p.x, -26, 26, 0),
        y: clamp(p.y, -16, 16, 0),
      };
    })
    .filter(Boolean);

  if (!players.length) return null;

  const rawRoutes = Array.isArray(raw.routes) ? raw.routes.slice(0, 11) : [];
  const routes = rawRoutes
    .map((r) => {
      if (!r || typeof r !== 'object') return null;
      const playerIndex = Number.isInteger(r.playerIndex) ? r.playerIndex : -1;
      if (playerIndex < 0 || playerIndex >= players.length) return null;
      const waypoints = Array.isArray(r.waypoints)
        ? r.waypoints
            .slice(0, 8)
            .map((w) => (w && typeof w === 'object' ? { x: clamp(w.x, -30, 30, 0), y: clamp(w.y, -20, 20, 0) } : null))
            .filter(Boolean)
        : [];
      if (waypoints.length < 2) return null;
      return {
        playerIndex,
        waypoints,
        style: ROUTE_STYLES.includes(r.style) ? r.style : 'solid',
        color: /^#[0-9a-fA-F]{6}$/.test(r.color || '') ? r.color : (mode === 'defense' ? '#4a9eff' : '#ffcc00'),
        assign: ASSIGN_TYPES.includes(r.assign) ? r.assign : null,
      };
    })
    .filter(Boolean);

  const rawLabels = Array.isArray(raw.labels) ? raw.labels.slice(0, 5) : [];
  const labels = rawLabels
    .map((l) => {
      if (!l || typeof l !== 'object') return null;
      const text = cleanStr(l.text, 30, null);
      if (!text) return null;
      return { x: clamp(l.x, -30, 30, 0), y: clamp(l.y, -20, 20, 0), text };
    })
    .filter(Boolean);

  return { name, formation, type, mode, players, routes, labels };
}

const PLAY_SCHEMA = {
  name: 'emit_play',
  description: "Emit exactly one football play as structured data matching the app's play format. Always call this tool — never respond with plain text.",
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: ['name', 'formation', 'type', 'mode', 'players', 'routes'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 40, description: 'Short, coach-style play name, e.g. "26 Power Right" or "Trips Right Four Verts".' },
      formation: { type: 'string', minLength: 1, maxLength: 30, description: 'Prefer an exact match from the provided known-formation list; otherwise a short descriptive name.' },
      type: { type: 'string', enum: PLAY_TYPES },
      mode: { type: 'string', enum: ['offense', 'defense'] },
      players: {
        type: 'array',
        minItems: 5,
        maxItems: 11,
        description: 'Every player on the field for this side, including linemen — not just skill positions.',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['pos', 'lbl', 'x', 'y'],
          properties: {
            pos: { type: 'string', minLength: 1, maxLength: 6, description: 'Position abbreviation, e.g. QB, LT, WR, MLB, CB.' },
            lbl: { type: 'string', minLength: 1, maxLength: 6, description: 'Label printed on the field — usually same as pos.' },
            x: { type: 'number', minimum: -26, maximum: 26 },
            y: { type: 'number', minimum: -16, maximum: 16 },
          },
        },
      },
      routes: {
        type: 'array',
        maxItems: 11,
        description: 'Route/assignment lines. First waypoint should match the player’s own x/y (their starting spot).',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['playerIndex', 'waypoints'],
          properties: {
            playerIndex: { type: 'integer', minimum: 0, maximum: 10, description: 'Zero-based index into the players array.' },
            waypoints: {
              type: 'array',
              minItems: 2,
              maxItems: 8,
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['x', 'y'],
                properties: { x: { type: 'number', minimum: -30, maximum: 30 }, y: { type: 'number', minimum: -20, maximum: 20 } },
              },
            },
            style: { type: 'string', enum: ROUTE_STYLES, description: 'solid=standard route/run path, dashed=option/zone drop, motion=pre-snap motion, block=blocking assignment.' },
            color: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' },
            assign: { type: 'string', enum: ASSIGN_TYPES, description: 'Defense only: rush, cover, zone, or blitz.' },
          },
        },
      },
      labels: {
        type: 'array',
        maxItems: 5,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['x', 'y', 'text'],
          properties: { x: { type: 'number', minimum: -30, maximum: 30 }, y: { type: 'number', minimum: -20, maximum: 20 }, text: { type: 'string', minLength: 1, maxLength: 30 } },
        },
      },
    },
  },
};

function buildSystemPrompt(mode) {
  const knownList = mode === 'defense' ? KNOWN_FORMATIONS.defense.join(', ') : KNOWN_FORMATIONS.offense.join(', ');
  return `You are a veteran football play designer building a play for a coach's digital playbook app. You must call the emit_play tool exactly once with a single, complete, realistic play — never reply in plain text.

COORDINATE SYSTEM (yards):
- x = 0 is the center of the field. Negative x = left, positive x = right. Valid range roughly -26 to 26 (field is 53.3 yd wide).
- y = 0 is the line of scrimmage.
- POSITIVE y = the offensive backfield (behind the line of scrimmage). Offensive linemen sit at y ≈ 0. A QB under center is around y:1.5, shotgun QB around y:6-7, running backs y:5-8.
- NEGATIVE y = downfield, toward the opponent's end zone / the defense's side. Defensive linemen sit around y:-1, linebackers y:-3 to -5, corners y:-2, safeties y:-9 to -14.
- Every route's FIRST waypoint must equal that player's own starting x/y. Later waypoints trace the path the player actually runs. A receiver running a 15-yard go route starts near y:0 and its final waypoint is around y:-15 (routes for offense move toward NEGATIVE y as they go downfield). A run play's ball-carrier waypoint moves toward negative y and toward the hole. Defensive drops/blitzes also move toward negative y (further from their own goal line, toward the line of scrimmage/backfield) or laterally for zone drops.
- Include every player on the field for the requested side (offense = 11 including all 5 linemen; defense = 11 across the front, second level, and secondary) — not just the skill positions relevant to the concept.
- Prefer EXACTLY one of these known formation names when it's a reasonable fit (spelling/case must match exactly): ${knownList}. If nothing fits well, invent a short descriptive formation name instead of forcing a bad match.
- Give every offensive skill player and every eligible blocker a route/assignment entry (style "block" for blockers). Give every defensive player an assignment (rush/cover/zone/blitz) with a short waypoint showing their drop or blitz path.`;
}

export default async function handler(req) {
  const allowedOrigin = getAllowedOrigin(req);
  const cors = {
    'Access-Control-Allow-Origin': allowedOrigin || 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: cors });
  if (!allowedOrigin) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...cors, 'Content-Type': 'application/json' } });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY is not set on the server' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  const description = cleanStr(body?.description, 500, null);
  if (!description) {
    return new Response(JSON.stringify({ error: 'Please describe the play you want.' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
  const mode = body?.mode === 'defense' ? 'defense' : 'offense';
  const ageGroup = cleanStr(body?.age_group, 40, 'not specified');
  const skillLevel = cleanStr(body?.skill_level, 40, 'not specified');
  const focus = cleanStr(body?.focus, 60, 'not specified');
  const avoidFormations = Array.isArray(body?.avoid_formations)
    ? body.avoid_formations.filter((f) => typeof f === 'string').slice(0, 15).map((f) => f.slice(0, 40))
    : [];

  const userContent = `Build this play: "${description}"

TEAM CONTEXT:
- Side of ball: ${mode}
- Age group: ${ageGroup.replace(/-/g, ' ')}
- Skill level: ${skillLevel}
- Focus/category: ${focus}
${avoidFormations.length ? `- Avoid reusing these recently-suggested formations if possible: ${avoidFormations.join(', ')}` : ''}

Calibrate complexity to the age group and skill level (fewer route options and simpler reads for younger/beginner teams, more sophisticated route combinations and disguises for advanced/elite teams).`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 3000,
        system: buildSystemPrompt(mode),
        messages: [{ role: 'user', content: userContent }],
        tools: [PLAY_SCHEMA],
        tool_choice: { type: 'tool', name: 'emit_play' },
      }),
    });

    clearTimeout(timer);
    const data = await upstream.json();

    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || `Anthropic error ${upstream.status}` }), { status: upstream.status, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const toolUse = (data.content || []).find((b) => b.type === 'tool_use' && b.name === 'emit_play');
    const play = toolUse ? sanitizePlay(toolUse.input, mode) : null;

    if (!play) {
      return new Response(JSON.stringify({ error: 'The AI could not build a valid play from that description. Try rephrasing or being more specific.' }), { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify(play), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      return new Response(JSON.stringify({ error: 'Request timed out — try a simpler description or try again.' }), { status: 408, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ error: 'Failed to reach Anthropic API: ' + err.message }), { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
}
