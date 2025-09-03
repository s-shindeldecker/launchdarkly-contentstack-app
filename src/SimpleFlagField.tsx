import React, { useEffect, useState } from 'react';
import ContentstackAppSdk from '@contentstack/app-sdk';
import LaunchDarklyService, { LaunchDarklyFlag, LaunchDarklyVariation } from './services/launchDarklyService';

const SimpleFlagField: React.FC = () => {
  const [sdk, setSdk] = useState<any>(null);
  const [flagKey, setFlagKey] = useState('');
  const [flags, setFlags] = useState<LaunchDarklyFlag[]>([]);
  const [variations, setVariations] = useState<LaunchDarklyVariation[]>([]);
  const [selected, setSelected] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [ldService, setLdService] = useState<LaunchDarklyService | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        console.log('🚀 [SimpleFlagField] Initializing...');
        const sdkInstance = await ContentstackAppSdk.init();
        setSdk(sdkInstance);
        
        // Get configuration from SDK
        let config = null;
        try {
          config = await sdkInstance.getConfig();
          console.log('🔧 [SimpleFlagField] Config retrieved:', config);
        } catch (e) {
          console.log('⚠️ [SimpleFlagField] getConfig failed, trying AppConfigWidget...');
          
          // Try AppConfigWidget if available
          if (sdkInstance.location?.AppConfigWidget?.installation) {
            try {
              const installationData = await sdkInstance.location.AppConfigWidget.installation.getInstallationData();
              config = {
                launchdarkly: {
                  apiKey: installationData?.serverConfiguration?.apiKey || '',
                  projectKey: installationData?.configuration?.projectKey || '',
                  environmentKey: installationData?.configuration?.environmentKey || 'production'
                }
              };
              console.log('🔧 [SimpleFlagField] AppConfigWidget config:', config);
            } catch (e2) {
              console.log('⚠️ [SimpleFlagField] AppConfigWidget also failed');
            }
          }
        }
        
        // Extract LaunchDarkly configuration
        const launchdarkly = config?.launchdarkly || {};
        const apiKey = launchdarkly.apiKey || '';
        const projectKey = launchdarkly.projectKey || '';
        const environmentKey = launchdarkly.environmentKey || 'production';
        
        console.log('🔧 [SimpleFlagField] LaunchDarkly config:', {
          apiKey: apiKey ? '***SET***' : '❌ Not set',
          projectKey: projectKey || '❌ Not set',
          environmentKey: environmentKey || '❌ Not set'
        });
        
        // Create LaunchDarkly service
        if (projectKey && apiKey) {
          const service = new LaunchDarklyService(apiKey, projectKey, environmentKey);
          setLdService(service);
          
          // Load flags from real API
          try {
            const flagsList = await service.getFlags();
            setFlags(flagsList);
            console.log('✅ [SimpleFlagField] Loaded', flagsList.length, 'flags from API');
          } catch (apiError) {
            console.error('❌ [SimpleFlagField] API failed:', apiError);
            // Fall back to mock data
            const mockService = new LaunchDarklyService('mock-key', 'demo', 'production');
            const mockFlags = mockService.getMockFlags();
            setFlags(mockFlags);
            setError('API connection failed, using mock data');
            console.log('🔄 [SimpleFlagField] Using mock data as fallback');
          }
        } else {
          // Use mock data if no configuration
          const mockService = new LaunchDarklyService('mock-key', 'demo', 'production');
          const mockFlags = mockService.getMockFlags();
          setFlags(mockFlags);
          setError('No LaunchDarkly configuration found, using mock data');
          console.log('🔄 [SimpleFlagField] Using mock data - no config');
        }
        
        setLoading(false);
        console.log('✅ [SimpleFlagField] Initialization complete');
      } catch (err) {
        console.error('❌ [SimpleFlagField] Failed to initialize:', err);
        setError('Failed to initialize');
        setLoading(false);
      }
    };
    
    init();
  }, []);

  const handleFlagChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFlagKey = e.target.value;
    setFlagKey(newFlagKey);
    setSelected(0);
    
    if (newFlagKey) {
      const flag = flags.find(f => f.key === newFlagKey);
      if (flag) {
        setVariations(flag.variations);
      }
    } else {
      setVariations([]);
    }
  };

  const handleVariationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelected(parseInt(e.target.value));
  };

  const handleSave = async () => {
    if (!sdk?.location?.CustomField?.field || !flagKey || variations.length === 0) {
      return;
    }
    
    try {
      const selectedVariation = variations[selected];
      const saveData = {
        flagKey,
        variationName: selectedVariation.name,
        variationValue: selectedVariation.value,
        variationId: selectedVariation._id
      };
      
      await sdk.location.CustomField.field.setData(saveData);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      console.log('✅ [SimpleFlagField] Saved:', saveData);
    } catch (err) {
      console.error('❌ [SimpleFlagField] Save failed:', err);
      setError('Failed to save');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 16, textAlign: 'center' }}>
        <div>Loading LaunchDarkly flags...</div>
      </div>
    );
  }

  if (!sdk?.location?.CustomField?.field) {
    return (
      <div style={{ padding: 16, textAlign: 'center' }}>
        <div style={{ color: '#b00020', marginBottom: 12 }}>Custom field context not available</div>
        <div style={{ fontSize: 12, color: '#666' }}>
          Available locations: {sdk?.location ? Object.keys(sdk.location).join(', ') : 'None'}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: 16 }}>LaunchDarkly Flag Selection</h3>
      
      {error && (
        <div style={{ 
          padding: 12, 
          backgroundColor: '#fff3cd', 
          border: '1px solid #ffeaa7', 
          borderRadius: 4, 
          fontSize: 12,
          marginBottom: 16,
          color: '#856404'
        }}>
          ⚠️ {error}
        </div>
      )}
      
      <div style={{ display: 'grid', gap: 12 }}>
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 'bold' }}>Select Flag:</span>
          <select 
            value={flagKey} 
            onChange={handleFlagChange}
            style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4, fontSize: 14 }}
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
          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 'bold' }}>Select Variation:</span>
            <select 
              value={selected} 
              onChange={handleVariationChange}
              style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4, fontSize: 14 }}
            >
              {variations.map((variation, index) => (
                <option key={variation._id} value={index}>
                  {variation.name} - {String(variation.value)}
                </option>
              ))}
            </select>
          </label>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button 
            onClick={handleSave} 
            disabled={!flagKey || variations.length === 0}
            style={{ 
              padding: '8px 16px', 
              fontSize: 14,
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: !flagKey || variations.length === 0 ? 'not-allowed' : 'pointer',
              opacity: !flagKey || variations.length === 0 ? 0.5 : 1
            }}
          >
            Save Selection
          </button>
          {saved && <span style={{ color: '#28a745', fontSize: 14 }}>Saved ✓</span>}
        </div>
      </div>
    </div>
  );
};

export default SimpleFlagField;
