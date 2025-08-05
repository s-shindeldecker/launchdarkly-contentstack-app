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

  useEffect(() => {
    const initializeSDK = async () => {
      try {
        // Initialize the SDK
        const sdkInstance = await ContentstackAppSDK.init();
        setSdk(sdkInstance);
        
        // Get configuration using the public API
        const config = await sdkInstance.getConfig();
        const apiKey = config?.launchdarkly?.api_key || '';
        const environment = config?.launchdarkly?.environment || 'production';
        
        if (apiKey) {
          setLdService(new LaunchDarklyService(apiKey, environment));
        } else {
          setLdService(new LaunchDarklyService('mock-key', environment));
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
      
      if (ldService['apiKey'] === 'mock-key') {
        flagsList = ldService.getMockFlags();
      } else {
        flagsList = await ldService.getFlags();
      }
      
      setFlags(flagsList);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch flags: ' + (err as Error).message);
      setLoading(false);
    }
  };

  const fetchFlagVariations = async (key?: string) => {
    const flagToFetch = key || flagKey;
    if (!flagToFetch) {
      setError('Please select a flag');
      return;
    }

    if (!ldService) {
      setError('LaunchDarkly service not initialized');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let variationsList: LaunchDarklyVariation[];
      
      if (ldService['apiKey'] === 'mock-key') {
        variationsList = ldService.getMockVariations(flagToFetch);
      } else {
        variationsList = await ldService.getFlagVariations(flagToFetch);
      }
      
      setVariations(variationsList);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch flag variations: ' + (err as Error).message);
      setLoading(false);
    }
  };

  const handleFlagChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFlagKey = e.target.value;
    setFlagKey(newFlagKey);
    setVariations([]);
    setSelected(0);
    setError(null);
    
    if (newFlagKey) {
      fetchFlagVariations(newFlagKey);
    }
  };

  const handleSave = async () => {
    if (!sdk) {
      setError('SDK not initialized');
      return;
    }

    if (!flagKey) {
      setError('Please select a flag');
      return;
    }

    if (variations.length === 0) {
      setError('Please load flag variations first');
      return;
    }

    const field = sdk.location.CustomField?.field;
    if (!field) {
      setError('Field not available');
      return;
    }

    const entryId = sdk.location.CustomField?.entry?.getData()?.uid || '';
    const contentType = sdk.location.CustomField?.entry?.content_type?.uid || '';
    
    // Get environment from config
    const config = await sdk.getConfig();
    const environment = config?.environment || 'preview';
    
    // Direct CMSReference structure matching your POC
    const value: SavedValue = {
      cmsType: 'contentstack',
      entryId,
      environment,
      contentType
    };

    field.setData(value);
    setSaved(true);
    setError(null);

    setTimeout(() => setSaved(false), 2000);
  };

  const handleVariationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelected(Number(e.target.value));
  };

  return (
    <div className="flag-variation-field">
      <div className="field-header">
        <label className="field-label">LaunchDarkly Flag Variation</label>
        {saved && <span className="saved-indicator">✓ Saved</span>}
      </div>

      <div className="field-content">
        <div className="input-group">
          <label className="input-label">Select Flag</label>
          <select
            value={flagKey}
            onChange={handleFlagChange}
            className="select-input"
            disabled={loading}
          >
            <option value="">Choose a LaunchDarkly flag...</option>
            {flags.map((flag) => (
              <option value={flag.key} key={flag.key}>
                {flag.name} ({flag.key})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={fetchFlags}
          disabled={loading}
          className="load-button"
        >
          {loading ? 'Loading...' : 'Refresh Flags'}
        </button>

        {error && <div className="error-message">{error}</div>}

        {variations.length > 0 && (
          <div className="variation-selector">
            <label className="input-label">Select Variation</label>
            <select
              value={selected}
              onChange={handleVariationChange}
              className="select-input"
            >
              {variations.map((variation, index) => (
                <option value={index} key={variation._id}>
                  {variation.name}
                  {variation.description && ` - ${variation.description}`}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={!flagKey || variations.length === 0}
          className="save-button"
        >
          Save Mapping
        </button>

        {flagKey && variations.length > 0 && (
          <div className="mapping-preview">
            <div className="preview-label">Current Mapping:</div>
            <div className="preview-content">
              <strong>Flag:</strong> {flags.find(f => f.key === flagKey)?.name || flagKey}<br/>
              <strong>Variation:</strong> {variations[selected]?.name}<br/>
              <strong>Entry ID:</strong> {sdk?.location.CustomField?.entry?.getData()?.uid || 'N/A'}<br/>
              <strong>Content Type:</strong> {sdk?.location.CustomField?.entry?.content_type?.uid || 'N/A'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlagVariationField; 