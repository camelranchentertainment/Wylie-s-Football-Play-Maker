export const config = { runtime: 'edge' };

export default async function handler(req) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({
      status: 'error',
      step: 'env',
      message: 'ANTHROPIC_API_KEY is not set in Vercel environment variables',
    }), { status: 200, headers: cors });
  }

  const keyPreview = apiKey.slice(0, 10) + '...' + apiKey.slice(-4);

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Say OK' }],
      }),
    });

    const raw = await res.text();
    let data;
    try { data = JSON.parse(raw); } catch { data = { raw }; }

    return new Response(JSON.stringify({
      status: res.ok ? 'ok' : 'error',
      step: 'anthropic',
      httpStatus: res.status,
      keyPreview,
      response: data,
    }), { status: 200, headers: cors });

  } catch (err) {
    return new Response(JSON.stringify({
      status: 'error',
      step: 'fetch',
      keyPreview,
      message: err.message,
    }), { status: 200, headers: cors });
  }
}
