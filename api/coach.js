export const config = { runtime: 'edge' };

// Allowed origins: the production domain, any *.vercel.app preview, and localhost dev.
// Set ALLOWED_ORIGIN env var in Vercel to lock down to a single custom domain.
function getAllowedOrigin(req) {
  const origin = req.headers.get('origin') || '';
  const allowed = process.env.ALLOWED_ORIGIN;
  if (allowed) {
    return origin === allowed ? origin : null;
  }
  if (
    origin === 'http://localhost:3000' ||
    origin === 'http://localhost:8765' ||
    /^https:\/\/[\w-]+\.vercel\.app$/.test(origin)
  ) {
    return origin;
  }
  return null;
}

export default async function handler(req) {
  const allowedOrigin = getAllowedOrigin(req);
  const cors = {
    'Access-Control-Allow-Origin': allowedOrigin || 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: cors });
  }

  if (!allowedOrigin) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY is not set on the server' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const { model, max_tokens, messages } = body || {};
  if (!messages || !Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: 'Missing or invalid messages array' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  // 20-second timeout so we return a clean error before Vercel's 25s hard kill
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);

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
        model: model || 'claude-haiku-4-5-20251001',
        max_tokens: max_tokens || 1800,
        messages,
      }),
    });

    clearTimeout(timer);
    const data = await upstream.json();

    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || `Anthropic error ${upstream.status}` }), {
        status: upstream.status,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      return new Response(JSON.stringify({ error: 'Request timed out — try requesting fewer plays or try again.' }), {
        status: 408,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: 'Failed to reach Anthropic API: ' + err.message }), {
      status: 502,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}
