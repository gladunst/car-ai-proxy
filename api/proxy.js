export default async function handler(req, res) {
  // Настраиваем CORS, чтобы Android-магнитола могла отправлять запросы
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
    // Берём секретный ключ из переменных окружения Vercel
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Server API key not configured' });
    }

    // Пересылаем запрос на официальный эндпоинт Groq
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(req.body)
    });

    const data = await groqResponse.json();
    return res.status(groqResponse.status).json(data);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
