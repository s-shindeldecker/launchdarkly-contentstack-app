module.exports = async function handler(req, res) {
  // Enable CORS for Contentstack
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.LD_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'LaunchDarkly API key not configured' });
    }

    const projectKey = req.query.projectKey;
    if (!projectKey) {
      return res.status(400).json({ error: 'projectKey is required' });
    }

    const environment = req.query.environment || 'production';

    const baseUrl = 'https://app.launchdarkly.com/api/v2';
    // Try v1 API format: /api/v1/flags/{projectKey}
    const url = `${baseUrl.replace('/v2', '/v1')}/flags/${encodeURIComponent(projectKey)}`;

    console.log('Calling LaunchDarkly API:', url);

    const response = await fetch(url, {
      headers: {
        'Authorization': `api_key ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return res.status(response.status).json({ 
        error: `LaunchDarkly API Error: ${error.message || response.statusText}` 
      });
    }

    const data = await response.json();
    
    // Handle both v1 and v2 response formats
    let flags = [];
    if (data && data.items) {
      // v2 format
      flags = data.items.filter(f => !f.archived).map(f => ({ key: f.key, name: f.name }));
    } else if (Array.isArray(data)) {
      // v1 format
      flags = data.filter(f => !f.archived).map(f => ({ key: f.key, name: f.name }));
    }

    res.status(200).json(flags);

  } catch (error) {
    console.error('LaunchDarkly proxy error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 