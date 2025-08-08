export default async function handler(req, res) {
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
    const { action, flagKey, environment } = req.query;
    
    // Get API key from environment variables
    const apiKey = process.env.LAUNCHDARKLY_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'LaunchDarkly API key not configured' });
    }

    const env = environment || 'production';
    const baseUrl = 'https://app.launchdarkly.com/api/v2';

    let endpoint = '';
    switch (action) {
      case 'flags':
        endpoint = `/flags?env=${env}`;
        break;
      case 'flag':
        if (!flagKey) {
          return res.status(400).json({ error: 'flagKey is required for flag action' });
        }
        endpoint = `/flags/${flagKey}?env=${env}`;
        break;
      default:
        return res.status(400).json({ error: 'Invalid action. Use "flags" or "flag"' });
    }

    const response = await fetch(`${baseUrl}${endpoint}`, {
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
    res.status(200).json(data);

  } catch (error) {
    console.error('LaunchDarkly proxy error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 