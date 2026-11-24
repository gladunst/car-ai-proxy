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
    const requestedModel = req.body?.model || '';
    const isGemini = requestedModel.startsWith('google/') || requestedModel.startsWith('gemini-');

    // Google model IDs may arrive as "google/<model>" from the Android app.
    // Google Gemini API expects the native model ID without the provider prefix.
    const googleModel = requestedModel.startsWith('google/')
      ? requestedModel.slice('google/'.length)
      : requestedModel;

    const targetUrl = isGemini
      ? 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
      : 'https://api.groq.com/openai/v1/chat/completions';

    const apiKey = isGemini ? process.env.GEMINI_API_KEY : process.env.GROQ_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: `API key for ${isGemini ? 'Gemini' : 'Groq'} is not configured`
      });
    }

    const requestBody = isGemini
      ? { ...req.body, model: googleModel }
      : req.body;

    const aiResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
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
