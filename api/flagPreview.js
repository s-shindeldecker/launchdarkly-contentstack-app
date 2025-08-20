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
    const { flagKey, variationIndex, projectKey, environment } = req.query;

    if (!flagKey || variationIndex === undefined || !projectKey) {
      res.status(400).json({ error: 'Missing required parameters: flagKey, variationIndex, projectKey' });
      return;
    }

    const apiKey = process.env.LD_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'LaunchDarkly API key not configured' });
      return;
    }

    // Get flag details from LaunchDarkly
    const baseUrl = 'https://app.launchdarkly.com/api/v2';
    const flagUrl = `${baseUrl}/projects/${encodeURIComponent(projectKey)}/flags/${encodeURIComponent(flagKey)}`;

    const flagResponse = await fetch(flagUrl, {
      headers: {
        Authorization: `api_key ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    if (!flagResponse.ok) {
      res.status(flagResponse.status).json({ 
        error: `LaunchDarkly API Error: ${flagResponse.statusText}` 
      });
      return;
    }

    const flag = await flagResponse.json();
    const variation = flag.variations && flag.variations[variationIndex];

    if (!variation) {
      res.status(404).json({ error: 'Variation not found' });
      return;
    }

    // Generate preview content based on flag and variation
    const previewContent = generatePreviewContent(flag, variation, projectKey, environment);

    const result = {
      flagKey,
      variationIndex: parseInt(variationIndex),
      variationValue: variation.value,
      content: previewContent,
      metadata: {
        flagName: flag.name,
        variationName: variation.name,
        projectKey,
        environment
      }
    };

    res.status(200).json(result);
  } catch (err) {
    console.error('FlagPreview API Error:', err);
    res.status(500).json({ error: (err && err.message) || 'Internal server error' });
  }
};

// Generate preview content based on flag and variation
function generatePreviewContent(flag, variation, projectKey, environment) {
  const flagKey = flag.key;
  const variationValue = variation.value;

  // Example content generation based on flag type
  if (flagKey.includes('banner') || flagKey.includes('message')) {
    return {
      type: 'text',
      content: variationValue || 'Default content',
      style: {
        backgroundColor: '#f8f9fa',
        padding: '16px',
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }
    };
  }

  if (flagKey.includes('image') || flagKey.includes('media')) {
    return {
      type: 'image',
      imageUrl: variationValue || 'https://via.placeholder.com/400x200?text=Preview+Image',
      alt: `Preview for ${flag.name}`,
      caption: variation.name
    };
  }

  if (flagKey.includes('layout') || flagKey.includes('style')) {
    return {
      type: 'layout',
      layout: variationValue || 'default',
      className: `layout-${variationValue}`,
      description: `Layout variation: ${variation.name}`
    };
  }

  // Default content preview
  return {
    type: 'generic',
    content: variationValue,
    description: `Flag: ${flag.name}, Variation: ${variation.name}`,
    metadata: {
      flagKey,
      variationIndex: variation._id,
      projectKey,
      environment
    }
  };
}
