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

    // Get environment from query or default to production
    const environment = req.query.environment || 'production';

    const baseUrl = 'https://app.launchdarkly.com/api/v2';
    // Use correct v2 API format: /flags?env=ENV&project=PROJECT_KEY
    const url = `${baseUrl}/flags?env=${encodeURIComponent(environment)}&project=${encodeURIComponent(projectKey)}&limit=200`;

    console.log('Calling LaunchDarkly API:', url);

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

    const flags = await response.json();
    const filtered = Array.isArray(flags && flags.items)
      ? flags.items.filter((f) => !f.archived).map((f) => ({ key: f.key, name: f.name }))
      : Array.isArray(flags)
        ? flags.filter((f) => !f.archived).map((f) => ({ key: f.key, name: f.name }))
        : [];

    res.status(200).json(filtered);
  } catch (err) {
    res.status(500).json({ error: (err && err.message) || 'Internal server error' });
  }
}; 