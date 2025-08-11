module.exports = async function handler(req, res) {
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
    const flagKey = req.query && req.query.flagKey;
    if (!flagKey || typeof flagKey !== 'string') {
      res.status(400).json({ error: 'Missing or invalid flagKey' });
      return;
    }

    const apiKey = process.env.LD_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'LaunchDarkly API key not configured' });
      return;
    }

    const projectKeyFromQuery = req.query && req.query.projectKey;
    const projectKey = projectKeyFromQuery || process.env.LAUNCHDARKLY_PROJECT_KEY;
    if (!projectKey) {
      res.status(500).json({ error: 'LaunchDarkly project key not configured (set LAUNCHDARKLY_PROJECT_KEY or pass ?projectKey=...)' });
      return;
    }

    const environment = (req.query && req.query.environment) || process.env.LAUNCHDARKLY_ENVIRONMENT || 'production';
    const baseUrl = 'https://app.launchdarkly.com/api/v2';

    const url = `${baseUrl}/flags/${encodeURIComponent(projectKey)}/${encodeURIComponent(flagKey)}?env=${encodeURIComponent(environment)}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `api_key ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      let message = response.statusText;
      try {
        const errJson = await response.json();
        message = (errJson && errJson.message) || message;
      } catch {}
      res.status(response.status).json({ error: `LaunchDarkly API Error: ${message}` });
      return;
    }

    const flag = await response.json();
    const result = {
      key: (flag && flag.key) || flagKey,
      variations: Array.isArray(flag && flag.variations) ? flag.variations : [],
    };

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: (err && err.message) || 'Internal server error' });
  }
} 