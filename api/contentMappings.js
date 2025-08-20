module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    // Get content mappings for an entry
    try {
      const { entryId, projectKey, environment } = req.query;

      if (!entryId || !projectKey) {
        res.status(400).json({ error: 'Missing required parameters: entryId, projectKey' });
        return;
      }

      // For now, return mock data
      // In production, you'd query your database
      const mockMappings = [
        {
          entryId,
          contentType: 'page',
          flagKey: 'welcome-message',
          variationIndex: 1,
          variationValue: 'Welcome back!',
          lastUpdated: new Date().toISOString()
        },
        {
          entryId,
          contentType: 'page',
          flagKey: 'feature-banner',
          variationIndex: 0,
          variationValue: false,
          lastUpdated: new Date().toISOString()
        }
      ];

      res.status(200).json(mockMappings);
    } catch (err) {
      console.error('Get Content Mappings Error:', err);
      res.status(500).json({ error: (err && err.message) || 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    // Save a new content mapping
    try {
      const mapping = req.body;

      if (!mapping.entryId || !mapping.flagKey || mapping.variationIndex === undefined) {
        res.status(400).json({ error: 'Missing required fields: entryId, flagKey, variationIndex' });
        return;
      }

      // For now, just return the mapping with a timestamp
      // In production, you'd save to your database
      const savedMapping = {
        ...mapping,
        lastUpdated: new Date().toISOString()
      };

      res.status(200).json(savedMapping);
    } catch (err) {
      console.error('Save Content Mapping Error:', err);
      res.status(500).json({ error: (err && err.message) || 'Internal server error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};
