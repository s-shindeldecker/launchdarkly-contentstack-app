import React, { useEffect, useState } from 'react';
import { default as ContentstackAppSDK } from '@contentstack/app-sdk';
import LaunchDarklyService, { LaunchDarklyFlag, LaunchDarklyVariation } from './services/launchDarklyService';

// Updated to match your POC structure exactly
type CMSReference = {
  cmsType: 'contentstack';
  entryId: string;
  environment: string;
  contentType: string;  // Required, not optional
};

// Direct structure matching your POC - no wrapper object
type SavedValue = CMSReference;

const FlagVariationField = () => {
  const [sdk, setSdk] = useState<any>(null);
  const [flagKey, setFlagKey] = useState('');
  const [flags, setFlags] = useState<LaunchDarklyFlag[]>([]);
  const [variations, setVariations] = useState<LaunchDarklyVariation[]>([]);
  const [selected, setSelected] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [ldService, setLdService] = useState<LaunchDarklyService | null>(null);
  const [usingMockData, setUsingMockData] = useState(false);

  useEffect(() => {
    const initializeSDK = async () => {
      try {
        // Initialize the SDK
        const sdkInstance = await ContentstackAppSDK.init();
        setSdk(sdkInstance);
        
        // Get configuration from environment variables (Vercel sets these)
        let projectKey = process.env.LAUNCHDARKLY_PROJECT_KEY || '';
        
        console.log('LaunchDarkly Config:', { 
          projectKey: projectKey ? projectKey : 'NOT SET', 
          source: projectKey ? 'env' : 'none',
          proxy: 'Using Vercel serverless function proxy'
        });
        
        if (projectKey && projectKey.trim() !== '') {
          // For now, we'll use a mock API key since the real one is in the backend
          setLdService(new LaunchDarklyService('mock-key', projectKey));
          setUsingMockData(false);
          console.log('✅ Using real LaunchDarkly API via proxy');
        } else {
          setLdService(new LaunchDarklyService('mock-key', 'demo'));
          setUsingMockData(true);
          console.log('⚠️ Using mock data - project key not configured');
        }

        // Get saved value from field - now expecting direct CMSReference
        const field = sdkInstance.location.CustomField?.field;
        if (field) {
          const savedValue = field.getData() as SavedValue;
          if (savedValue && savedValue.cmsType === 'contentstack') {
            // Extract flag key from saved data if available
            // Note: In POC structure, flag info might be stored separately
            // For now, we'll need to load flags and let user reselect
            fetchFlags();
          }
        }
      } catch (err) {
        setError('Failed to initialize SDK: ' + (err as Error).message);
      }
    };

    initializeSDK();
  }, []);

  const fetchFlags = async () => {
    if (!ldService) return;

    setLoading(true);
    setError(null);

    try {
      let flagsList: LaunchDarklyFlag[];
      
      if (usingMockData) {
        flagsList = ldService.getMockFlags();
        console.log('📋 Loading mock flags:', flagsList.map(f => f.key));
      } else {
        flagsList = await ldService.getFlags();
        console.log('📋 Loading real flags:', flagsList.map(f => f.key));
      }
      
      setFlags(flagsList);
      
      // If we have a saved flag key, try to select it
      if (flagKey && flagsList.some(f => f.key === flagKey)) {
        const flag = flagsList.find(f => f.key === flagKey);
        if (flag) {
          setSelected(0); // Default to first variation
          await fetchFlagVariations(flag.key);
        }
      }
    } catch (err: any) {
      console.error('Error fetching flags:', err);
      setError('Failed to load flags: ' + (err?.message || 'Unknown error'));
      
      // Fallback to mock data on error
      if (!usingMockData) {
        console.log('🔄 Falling back to mock data due to error');
        setUsingMockData(true);
        setLdService(new LaunchDarklyService('mock-key', 'demo'));
        const mockFlags = new LaunchDarklyService('mock-key', 'demo').getMockFlags();
        setFlags(mockFlags);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchFlagVariations = async (key?: string) => {
    if (!ldService) return;
    
    const flagKeyToUse = key || flagKey;
    if (!flagKeyToUse) return;

    try {
      let variationsList: LaunchDarklyVariation[];
      
      if (usingMockData) {
        variationsList = ldService.getMockVariations(flagKeyToUse);
      } else {
        variationsList = await ldService.getFlagVariations(flagKeyToUse);
      }
      
      setVariations(variationsList);
      
      // Reset selection if current selection is invalid
      if (selected >= variationsList.length) {
        setSelected(0);
      }
    } catch (err: any) {
      console.error('Error fetching variations:', err);
      setError('Failed to load variations: ' + (err?.message || 'Unknown error'));
    }
  };

  const handleFlagChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFlagKey = e.target.value;
    setFlagKey(newFlagKey);
    setSelected(0);
    
    if (newFlagKey) {
      fetchFlagVariations(newFlagKey);
    } else {
      setVariations([]);
    }
  };

  const handleSave = async () => {
    if (!sdk || !flagKey || variations.length === 0) return;
    
    try {
      const field = sdk.location.CustomField?.field;
      if (!field) {
        setError('Field not found');
        return;
      }

      const selectedVariation = variations[selected];
      if (!selectedVariation) {
        setError('No variation selected');
        return;
      }

      // Create the saved value structure matching your POC
      const savedValue: SavedValue = {
        cmsType: 'contentstack',
        entryId: field.getData()?.entryId || 'unknown',
        environment: field.getData()?.environment || 'production',
        contentType: field.getData()?.contentType || 'unknown'
      };

      // Save to the field
      await field.setData(savedValue);
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      
      console.log('✅ Saved flag selection:', {
        flagKey,
        variation: selectedVariation.name,
        value: selectedVariation.value
      });
    } catch (err: any) {
      console.error('Error saving:', err);
      setError('Failed to save: ' + (err?.message || 'Unknown error'));
    }
  };

  const handleVariationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelected(parseInt(e.target.value));
  };

  if (loading && flags.length === 0) {
    return (
      <div style={{ padding: 16, textAlign: 'center' }}>
        <div>Loading LaunchDarkly flags...</div>
      </div>
    );
  }

  if (error && flags.length === 0) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ color: '#b00020', marginBottom: 12 }}>Error: {error}</div>
        <button onClick={fetchFlags} style={{ padding: '8px 12px' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: 16 }}>LaunchDarkly Flag Selection</h3>
        {usingMockData && (
          <div style={{ 
            padding: 8, 
            backgroundColor: '#fff3cd', 
            border: '1px solid #ffeaa7', 
            borderRadius: 4, 
            fontSize: 12,
            marginBottom: 12
          }}>
            ⚠️ Using mock data - configure project key in config screen
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Select Flag:</span>
          <select 
            value={flagKey} 
            onChange={handleFlagChange}
            style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
          >
            <option value="">Choose a flag...</option>
            {flags.map(flag => (
              <option key={flag.key} value={flag.key}>
                {flag.name} ({flag.key})
              </option>
            ))}
          </select>
        </label>

        {flagKey && variations.length > 0 && (
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Select Variation:</span>
            <select 
              value={selected} 
              onChange={handleVariationChange}
              style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
            >
              {variations.map((variation, index) => (
                <option key={variation._id} value={index}>
                  {variation.name} - {String(variation.value)}
                </option>
              ))}
            </select>
          </label>
        )}

        {error && (
          <div style={{ color: '#b00020', fontSize: 12 }}>{error}</div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button 
            onClick={handleSave} 
            disabled={!flagKey || variations.length === 0}
            style={{ padding: '8px 12px' }}
          >
            Save Selection
          </button>
          {saved && <span style={{ color: '#0a7f36' }}>Saved ✓</span>}
        </div>
      </div>
    </div>
  );
};

export default FlagVariationField; 