import { fetch } from 'undici';

export default async function handler(req: any, res: any) {
  // CORS for Contentstack iframe usage
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
    const flagKey: string | undefined = req.query?.flagKey;
    if (!flagKey || typeof flagKey !== 'string') {
      res.status(400).json({ error: 'Missing or invalid flagKey' });
      return;
    }

    const apiKey = process.env.LAUNCHDARKLY_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'LaunchDarkly API key not configured' });
      return;
    }

    // Allow overriding environment via query, else use env var, else default
    const environment = (req.query?.environment as string) || process.env.LAUNCHDARKLY_ENVIRONMENT || 'production';
    const baseUrl = 'https://app.launchdarkly.com/api/v2';

    const response = await fetch(`${baseUrl}/flags/${encodeURIComponent(flagKey)}?env=${encodeURIComponent(environment)}`, {
      headers: {
        Authorization: `api_key ${apiKey}`,
        'Content-Type': 'application/json',
      },
    } as any);

    if (!response.ok) {
      let message = response.statusText as any;
      try {
        const errJson = await response.json();
        message = (errJson as any)?.message || message;
      } catch {}
      res.status(response.status).json({ error: `LaunchDarkly API Error: ${message}` });
      return;
    }

    const flag = await response.json();

    // Normalize to expected shape
    const result = {
      key: (flag as any)?.key ?? flagKey,
      variations: Array.isArray((flag as any)?.variations) ? (flag as any).variations : [],
    };

    res.status(200).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Internal server error' });
  }
} 