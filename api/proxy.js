export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests are allowed' });
  }

  try {
    const model = req.body?.model || '';
    const useAiGateway = model.startsWith('google/') || model.startsWith('gemini-');

    // Google/Gemini model IDs (including google/gemini-4-hydrogen) use Vercel AI Gateway.
    // Keep the existing Groq route for all other model IDs.
    const targetUrl = useAiGateway
      ? 'https://ai-gateway.vercel.sh/v1/chat/completions'
      : 'https://api.groq.com/openai/v1/chat/completions';

    const apiKey = useAiGateway
      ? process.env.AI_GATEWAY_API_KEY
      : process.env.GROQ_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: useAiGateway
          ? 'AI Gateway API key is not configured'
          : 'Groq API key is not configured'
      });
    }

    const aiResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(req.body)
    });

    const responseText = await aiResponse.text();
    let data;
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      data = { error: 'Upstream returned a non-JSON response' };
    }

    return res.status(aiResponse.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Proxy request failed' });
  }
}
