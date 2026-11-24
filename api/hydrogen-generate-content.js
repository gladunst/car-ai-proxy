import { GoogleGenAI } from '@google/genai';

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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
  }

  const input = req.body?.input;
  const requestedThinkingLevel = req.body?.thinkingLevel ?? 'low';
  const allowedThinkingLevels = new Set(['low', 'medium', 'high', 'xhigh']);

  if (typeof input !== 'string' || input.trim().length === 0) {
    return res.status(400).json({ error: 'A non-empty string input is required' });
  }

  if (input.length > 12000) {
    return res.status(413).json({ error: 'Input is too long for this diagnostic endpoint' });
  }

  if (!allowedThinkingLevels.has(requestedThinkingLevel)) {
    return res.status(400).json({
      error: 'thinkingLevel must be one of: low, medium, high, xhigh'
    });
  }

  try {
    const client = new GoogleGenAI({
      apiKey,
      httpOptions: {
        apiVersion: 'v1beta',
        timeout: 30000,
        retryOptions: { attempts: 1 }
      }
    });

    const response = await client.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: input,
      config: {
        store: false,
        thinkingConfig: {
          thinkingLevel: requestedThinkingLevel
        }
      }
    });

    return res.status(200).json({
      ok: true,
      model: 'gemini-4-hydrogen',
      sdk: '@google/genai@3.6.1',
      api: 'GenerateContent',
      thinkingLevel: requestedThinkingLevel,
      responseText: response.text ?? null
    });
  } catch (err) {
    const status = Number.isInteger(err?.status) ? err.status : 502;
    return res.status(status).json({
      ok: false,
      model: 'gemini-4-hydrogen',
      api: 'GenerateContent',
      error: err?.message || 'Gemini SDK request failed'
    });
  }
}
