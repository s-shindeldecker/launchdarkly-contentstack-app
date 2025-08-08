export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const apiKey = process.env.LAUNCHDARKLY_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'LaunchDarkly API key not configured' });
      return;
    }

    const environment = (req.query?.environment as string) || process.env.LAUNCHDARKLY_ENVIRONMENT || 'production';
    const baseUrl = 'https://app.launchdarkly.com/api/v2';

    const response = await fetch(`${baseUrl}/flags?env=${encodeURIComponent(environment)}`, {
      headers: {
        Authorization: `api_key ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      let message = response.statusText;
      try {
        const errJson = await response.json();
        message = errJson?.message || message;
      } catch {}
      res.status(response.status).json({ error: `LaunchDarkly API Error: ${message}` });
      return;
    }

    const flags = await response.json();

    // Return only active, non-archived flags with minimal fields used by the UI
    const filtered = Array.isArray(flags)
      ? flags.filter((f: any) => !f.archived && f.on).map((f: any) => ({ key: f.key, name: f.name }))
      : [];

    res.status(200).json(filtered);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Internal server error' });
  }
} 