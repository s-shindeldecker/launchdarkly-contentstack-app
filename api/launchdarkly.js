module.exports = async function handler(req, res) {
  // Enable CORS for Contentstack - be more permissive
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Add security headers that might help with CSP
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

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
    // Use correct v2 API format: /flags/{projectKey} with environment filter
    const url = `${baseUrl}/flags/${encodeURIComponent(projectKey)}?env=${encodeURIComponent(environment)}`;

    console.log('Calling LaunchDarkly API:', url);

    const response = await fetch(url, {
      headers: {
        'Authorization': `api_key ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
    });

    if (!response.ok) {
      // Try to get error details, but handle non-JSON responses gracefully
      let errorMessage = response.statusText;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (parseError) {
        // If response isn't JSON, try to get text content
        try {
          const textContent = await response.text();
          if (textContent.includes('<!DOCTYPE')) {
            errorMessage = `HTML response received (${response.status}) - check API endpoint and authentication`;
          } else {
            errorMessage = `Non-JSON response (${response.status}): ${textContent.substring(0, 100)}`;
          }
        } catch (textError) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
      }
      
      return res.status(response.status).json({ 
        error: `LaunchDarkly API Error: ${errorMessage}` 
      });
    }

    const data = await response.json();
    console.log('LaunchDarkly raw response data:', JSON.stringify(data, null, 2));
    console.log('Response data type:', typeof data);
    console.log('Response data keys:', data ? Object.keys(data) : 'null/undefined');
    
    // Handle v2 response format
    let flags = [];
    if (data && data.items) {
      // v2 format with items array
      flags = data.items.filter(f => !f.archived).map(f => ({ key: f.key, name: f.name }));
    } else if (Array.isArray(data)) {
      // Direct array format
      flags = data.filter(f => !f.archived).map(f => ({ key: f.key, name: f.name }));
    }
    console.log('Processed flags:', flags);
    res.status(200).json(flags);

  } catch (error) {
    console.error('LaunchDarkly proxy error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 