import React, { useEffect, useState } from 'react';
import ContentstackAppSdk from '@contentstack/app-sdk';
import LaunchDarklyService, { LaunchDarklyFlag, LaunchDarklyVariation, ContentMapping } from './services/launchDarklyService';

// Types for the sidebar widget
type InstallationParams = {
  launchdarkly?: {
    apiKey?: string;
    projectKey?: string;
    environmentKey?: string;
  };
};

type EntryData = {
  uid: string;
  title: string;
  [key: string]: any;
};

type FlagReference = {
  flagKey: string;
  variationIndex: number;
  variationName: string;
  variationValue: any;
};

const SidebarWidget: React.FC = () => {
  // State management
  const [sdk, setSdk] = useState<any>(null);
  const [entryData, setEntryData] = useState<EntryData | null>(null);
  const [flagReference, setFlagReference] = useState<FlagReference | null>(null);
  const [flags, setFlags] = useState<LaunchDarklyFlag[]>([]);
  const [selectedFlag, setSelectedFlag] = useState<LaunchDarklyFlag | null>(null);
  const [variations, setVariations] = useState<LaunchDarklyVariation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ldService, setLdService] = useState<LaunchDarklyService | null>(null);
  const [usingMockData, setUsingMockData] = useState(false);
  const [sdkInitialized, setSdkInitialized] = useState(false);
  const [installationParams, setInstallationParams] = useState<InstallationParams>({});

  // Content mapping state
  const [contentMappings, setContentMappings] = useState<ContentMapping[]>([]);
  const [selectedMapping, setSelectedMapping] = useState<ContentMapping | null>(null);
  const [previewContent, setPreviewContent] = useState<any>(null);
  const [isCreatingMapping, setIsCreatingMapping] = useState(false);
  const [newMapping, setNewMapping] = useState<Partial<ContentMapping>>({});

  // Initialize SDK and load configuration
  useEffect(() => {
    const initializeSDK = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Initialize the Contentstack App SDK
        const sdkInstance = await ContentstackAppSdk.init();
        setSdk(sdkInstance);
        setSdkInitialized(true);
        
        console.log('✅ [SidebarWidget] SDK initialized successfully');
        console.log('🔍 [SidebarWidget] SDK location:', sdkInstance.location);
        
        // Verify we're in the right context - check if SidebarWidget location is available
        if (!sdkInstance.location?.SidebarWidget) {
          console.warn('⚠️ [SidebarWidget] SidebarWidget location not available');
        }
        
        // Get installation parameters
        let rawParams = null;
        
        try {
          // Try to get installation parameters from the SDK
          if (sdkInstance.getConfig) {
            rawParams = await sdkInstance.getConfig();
            console.log('🔧 [SidebarWidget] Installation parameters from getConfig:', rawParams);
          }
        } catch (e) {
          console.log('❌ [SidebarWidget] getConfig failed:', e);
        }
        
        // Fallback: try to get from app configuration if available
        if (!rawParams && sdkInstance.location?.AppConfigWidget?.installation) {
          try {
            const installationData = await sdkInstance.location.AppConfigWidget.installation.getInstallationData();
            console.log('🔧 [SidebarWidget] Installation data from AppConfigWidget:', installationData);
            
            rawParams = {
              launchdarkly: {
                apiKey: installationData?.serverConfiguration?.apiKey || '',
                projectKey: installationData?.configuration?.projectKey || '',
                environmentKey: installationData?.configuration?.environmentKey || ''
              }
            };
          } catch (e) {
            console.log('❌ [SidebarWidget] AppConfigWidget.getInstallationData() failed:', e);
          }
        }
        
        const params: InstallationParams = {
          launchdarkly: {
            apiKey: rawParams?.launchdarkly?.apiKey || '',
            projectKey: rawParams?.launchdarkly?.projectKey || '',
            environmentKey: rawParams?.launchdarkly?.environmentKey || 'production'
          }
        };
        
        console.log('🔧 [SidebarWidget] Processed parameters:', params);
        setInstallationParams(params);
        
        // Create LaunchDarkly service if we have the required config
        if (params.launchdarkly?.projectKey && params.launchdarkly?.apiKey) {
          const service = new LaunchDarklyService(
            params.launchdarkly.apiKey,
            params.launchdarkly.projectKey,
            params.launchdarkly.environmentKey
          );
          setLdService(service);
          setUsingMockData(false);
          console.log('✅ [SidebarWidget] LaunchDarkly service created with real config');
        } else {
          // Use mock data if no real config
          const mockService = new LaunchDarklyService('mock-key', 'demo', 'production');
          setLdService(mockService);
          setUsingMockData(true);
          console.log('⚠️ [SidebarWidget] Using mock data - no real config available');
        }
        
        // Load entry data - try different methods to access entry
        try {
          let entry = null;
          
          // Method 1: Try to get entry data from the current context
          if (sdkInstance.location?.SidebarWidget) {
            // We're in a sidebar widget context, but entry data might not be directly accessible
            // For now, we'll use mock data or wait for the widget to be properly initialized
            console.log('📄 [SidebarWidget] In SidebarWidget context - entry data will be loaded when available');
          }
          
          // For development/testing, we can create mock entry data
          if (!entry) {
            entry = {
              uid: 'demo-entry-123',
              title: 'Demo Entry (Sidebar Widget)',
              launchdarkly: {
                flagKey: 'demo-flag',
                variationIndex: 0,
                variationName: 'Default',
                variationValue: 'enabled'
              }
            };
            console.log('📄 [SidebarWidget] Using demo entry data for development');
          }
          
          if (entry) {
            setEntryData(entry);
            
            // Look for LaunchDarkly flag references in the entry
            const flagRef = findFlagReference(entry);
            if (flagRef) {
              setFlagReference(flagRef);
              console.log('🚩 [SidebarWidget] Found flag reference:', flagRef);
            }
          } else {
            console.log('⚠️ [SidebarWidget] No entry data available');
          }
        } catch (entryError) {
          console.log('⚠️ [SidebarWidget] Could not load entry data:', entryError);
        }
        
        // Initial height update - try different methods
        try {
          // In Contentstack, height updates are typically handled automatically
          // or through specific location context methods
          if (sdkInstance.location?.SidebarWidget) {
            console.log('📏 [SidebarWidget] In SidebarWidget context - height will be managed by Contentstack');
          } else {
            console.log('⚠️ [SidebarWidget] No height update method available for this context');
          }
        } catch (e) {
          console.log('⚠️ [SidebarWidget] Initial height update failed:', e);
        }
        
      } catch (e: any) {
        console.error('❌ [SidebarWidget] Failed to initialize SDK:', e);
        setError(e?.message || 'Failed to initialize SDK');
      } finally {
        setLoading(false);
      }
    };

    initializeSDK();
  }, []);

  // Load flags when service is ready
  useEffect(() => {
    if (ldService && flags.length === 0) {
      fetchFlags();
    }
  }, [ldService]);

  // Load variations when flag is selected
  useEffect(() => {
    if (ldService && selectedFlag) {
      fetchVariations(selectedFlag.key);
    }
  }, [ldService, selectedFlag]);

  // Update height when content changes
  useEffect(() => {
    if (sdk && sdkInitialized) {
      updateHeight();
    }
  }, [entryData, flagReference, flags, variations, sdk, sdkInitialized]);

  // Load content mappings when service and entry data are available
  useEffect(() => {
    if (ldService && entryData?.uid) {
      loadContentMappings();
    }
  }, [ldService, entryData]);

  // Helper function to find flag references in entry data
  const findFlagReference = (entry: EntryData): FlagReference | null => {
    // Look for common field names that might contain flag references
    const possibleFields = ['launchdarkly', 'featureFlag', 'flag', 'ldFlag', 'variation'];
    
    for (const fieldName of possibleFields) {
      if (entry[fieldName]) {
        const fieldValue = entry[fieldName];
        
        // Check if it's a string that might be JSON
        if (typeof fieldValue === 'string') {
          try {
            const parsed = JSON.parse(fieldValue);
            if (parsed.flagKey || parsed.flag) {
              return {
                flagKey: parsed.flagKey || parsed.flag,
                variationIndex: parsed.variationIndex || 0,
                variationName: parsed.variationName || 'Unknown',
                variationValue: parsed.variationValue || 'Unknown'
              };
            }
          } catch (e) {
            // Not JSON, continue
          }
        }
        
        // Check if it's an object
        if (typeof fieldValue === 'object' && fieldValue !== null) {
          if (fieldValue.flagKey || fieldValue.flag) {
            return {
              flagKey: fieldValue.flagKey || fieldValue.flag,
              variationIndex: fieldValue.variationIndex || 0,
              variationName: fieldValue.variationName || 'Unknown',
              variationValue: fieldValue.variationValue || 'Unknown'
            };
          }
        }
      }
    }
    
    return null;
  };

  // Fetch flags from LaunchDarkly
  const fetchFlags = async () => {
    if (!ldService) return;

    try {
      setLoading(true);
      setError(null);
      
      let flagsList: LaunchDarklyFlag[];
      
      if (usingMockData) {
        flagsList = ldService.getMockFlags();
        console.log('🚩 [SidebarWidget] Loaded mock flags:', flagsList.length);
      } else {
        flagsList = await ldService.getFlags();
        console.log('🚩 [SidebarWidget] Loaded real flags:', flagsList.length);
      }
      
      setFlags(flagsList);
      
      // If we have a flag reference, try to find the matching flag
      if (flagReference) {
        const matchingFlag = flagsList.find(f => f.key === flagReference.flagKey);
        if (matchingFlag) {
          setSelectedFlag(matchingFlag);
        }
      }
      
    } catch (err: any) {
      console.error('❌ [SidebarWidget] Error fetching flags:', err);
      setError('Failed to load flags: ' + (err?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Fetch variations for a specific flag
  const fetchVariations = async (flagKey: string) => {
    if (!ldService) return;

    try {
      let variationsList: LaunchDarklyVariation[];
      
      if (usingMockData) {
        variationsList = ldService.getMockVariations(flagKey);
      } else {
        variationsList = await ldService.getFlagVariations(flagKey);
      }
      
      setVariations(variationsList);
      
    } catch (err: any) {
      console.error('❌ [SidebarWidget] Error fetching variations:', err);
      setError('Failed to load variations: ' + (err?.message || 'Unknown error'));
    }
  };

  // Content mapping functions
  const loadContentMappings = async () => {
    if (!ldService || !entryData?.uid) return;

    try {
      let mappings: ContentMapping[];
      
      if (usingMockData) {
        mappings = ldService.getMockContentMappings(entryData.uid);
      } else {
        mappings = await ldService.getContentMappings(entryData.uid);
      }
      
      setContentMappings(mappings);
      console.log('📋 [SidebarWidget] Loaded content mappings:', mappings.length);
    } catch (err: any) {
      console.error('❌ [SidebarWidget] Error loading content mappings:', err);
      setError('Failed to load content mappings: ' + (err?.message || 'Unknown error'));
    }
  };

  const loadPreviewContent = async (mapping: ContentMapping) => {
    if (!ldService) return;

    try {
      let preview: any;
      
      if (usingMockData) {
        // Generate mock preview content
        preview = {
          type: 'mock',
          content: `Mock preview for ${mapping.flagKey} variation ${mapping.variationIndex}`,
          metadata: {
            flagKey: mapping.flagKey,
            variationIndex: mapping.variationIndex
          }
        };
      } else {
        preview = await ldService.getFlagPreview(mapping.flagKey, mapping.variationIndex);
      }
      
      setPreviewContent(preview);
      setSelectedMapping(mapping);
    } catch (err: any) {
      console.error('❌ [SidebarWidget] Error loading preview content:', err);
      setError('Failed to load preview content: ' + (err?.message || 'Unknown error'));
    }
  };

  const saveContentMapping = async () => {
    if (!ldService || !entryData?.uid || !newMapping.flagKey || newMapping.variationIndex === undefined) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      const mapping: ContentMapping = {
        entryId: entryData.uid,
        contentType: entryData.contentType || 'page',
        flagKey: newMapping.flagKey,
        variationIndex: newMapping.variationIndex,
        variationValue: newMapping.variationValue || 'Unknown'
      };

      let savedMapping: ContentMapping;
      
      if (usingMockData) {
        savedMapping = await ldService.saveMockContentMapping(mapping);
      } else {
        savedMapping = await ldService.saveContentMapping(mapping);
      }
      
      // Add to existing mappings
      setContentMappings(prev => [...prev, savedMapping]);
      
      // Reset form
      setNewMapping({});
      setIsCreatingMapping(false);
      
      console.log('✅ [SidebarWidget] Content mapping saved:', savedMapping);
    } catch (err: any) {
      console.error('❌ [SidebarWidget] Error saving content mapping:', err);
      setError('Failed to save content mapping: ' + (err?.message || 'Unknown error'));
    }
  };

  // Update height
  const updateHeight = async () => {
    try {
      // In Contentstack, height updates are typically handled automatically
      // or through specific location context methods
      if (sdk?.location?.SidebarWidget) {
        console.log('📏 [SidebarWidget] In SidebarWidget context - height managed by Contentstack');
      } else {
        console.log('⚠️ [SidebarWidget] No height update method available for this context');
      }
    } catch (e) {
      console.log('⚠️ [SidebarWidget] Height update failed:', e);
    }
  };

  // Early returns
  if (!sdkInitialized && loading) {
    return (
      <div style={{ padding: 16, textAlign: 'center' }}>
        <div>Initializing LaunchDarkly Sidebar Widget...</div>
      </div>
    );
  }

  if (!sdkInitialized && error) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ color: '#b00020', marginBottom: 12 }}>Initialization Error: {error}</div>
        <button onClick={() => window.location.reload()} style={{ padding: '8px 12px' }}>
          Retry
        </button>
      </div>
    );
  }

  if (!sdk) {
    return (
      <div style={{ padding: 16, textAlign: 'center' }}>
        <div>Contentstack App SDK not available</div>
      </div>
    );
  }

  // Main render
  return (
    <div style={{ 
      padding: 12, 
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      maxHeight: '600px',
      overflow: 'auto'
    }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: 16, color: '#333' }}>
          🚩 LaunchDarkly Integration
        </h3>
        <div style={{ fontSize: 12, color: '#666' }}>
          View and manage feature flags for this entry
        </div>
      </div>

      {/* Entry Information */}
      {entryData && (
        <div style={{ 
          padding: 12, 
          backgroundColor: '#f8f9fa', 
          borderRadius: 6, 
          marginBottom: 16,
          border: '1px solid #e9ecef'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: 6, fontSize: 13 }}>📄 Entry Details</div>
          <div style={{ fontSize: 11, color: '#666' }}>
            <div><strong>Title:</strong> {entryData.title || 'Untitled'}</div>
            <div><strong>UID:</strong> {entryData.uid}</div>
          </div>
        </div>
      )}

      {/* Configuration Status */}
      <div style={{ 
        padding: 12, 
        backgroundColor: usingMockData ? '#fff3cd' : '#d4edda', 
        border: `1px solid ${usingMockData ? '#ffeaa7' : '#c3e6cb'}`, 
        borderRadius: 6, 
        marginBottom: 16,
        fontSize: 12
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: 6, color: usingMockData ? '#856404' : '#155724' }}>
          {usingMockData ? '⚠️ Using Mock Data' : '✅ Connected to LaunchDarkly'}
        </div>
        <div style={{ fontSize: 11, color: usingMockData ? '#856404' : '#155724' }}>
          {usingMockData ? (
            'LaunchDarkly configuration not set. Using demo data for preview.'
          ) : (
            <>
              <strong>Project:</strong> {installationParams.launchdarkly?.projectKey} | 
              <strong> Environment:</strong> {installationParams.launchdarkly?.environmentKey || 'production'}
            </>
          )}
        </div>
      </div>

      {/* Flag Reference Display */}
      {flagReference ? (
        <div style={{ 
          padding: 12, 
          backgroundColor: '#e3f2fd', 
          border: '1px solid #2196f3', 
          borderRadius: 6, 
          marginBottom: 16
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: 6, fontSize: 13, color: '#1976d2' }}>
            🎯 Current Flag Assignment
          </div>
          <div style={{ fontSize: 12 }}>
            <div><strong>Flag:</strong> {flagReference.flagKey}</div>
            <div><strong>Variation:</strong> {flagReference.variationName}</div>
            <div><strong>Value:</strong> {String(flagReference.variationValue)}</div>
          </div>
        </div>
      ) : (
        <div style={{ 
          padding: 12, 
          backgroundColor: '#f8f9fa', 
          border: '1px solid #dee2e6', 
          borderRadius: 6, 
          marginBottom: 16,
          fontSize: 12,
          color: '#666'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: 6 }}>ℹ️ No Flag Assigned</div>
          <div>This entry is not currently mapped to a LaunchDarkly feature flag.</div>
        </div>
      )}

      {/* Available Flags */}
      {flags.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 13 }}>🚩 Available Flags</div>
          <div style={{ fontSize: 12 }}>
            {flags.slice(0, 5).map(flag => (
              <div 
                key={flag.key}
                style={{ 
                  padding: 8, 
                  backgroundColor: flag.key === flagReference?.flagKey ? '#e8f5e8' : '#fff',
                  border: `1px solid ${flag.key === flagReference?.flagKey ? '#4caf50' : '#dee2e6'}`,
                  borderRadius: 4,
                  marginBottom: 6,
                  cursor: 'pointer'
                }}
                onClick={() => setSelectedFlag(flag)}
              >
                <div style={{ fontWeight: 'bold' }}>{flag.name}</div>
                <div style={{ fontSize: 11, color: '#666' }}>{flag.key}</div>
                {flag.key === flagReference?.flagKey && (
                  <div style={{ fontSize: 11, color: '#4caf50', marginTop: 4 }}>
                    ✓ Currently assigned
                  </div>
                )}
              </div>
            ))}
            {flags.length > 5 && (
              <div style={{ fontSize: 11, color: '#666', textAlign: 'center', marginTop: 8 }}>
                +{flags.length - 5} more flags available
              </div>
            )}
          </div>
        </div>
      )}

      {/* Flag Variations */}
      {selectedFlag && variations.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 13 }}>
            🎭 Variations for "{selectedFlag.name}"
          </div>
          <div style={{ fontSize: 12 }}>
            {variations.map((variation, index) => (
              <div 
                key={variation._id}
                style={{ 
                  padding: 8, 
                  backgroundColor: index === flagReference?.variationIndex ? '#e8f5e8' : '#fff',
                  border: `1px solid ${index === flagReference?.variationIndex ? '#4caf50' : '#dee2e6'}`,
                  borderRadius: 4,
                  marginBottom: 6
                }}
              >
                <div style={{ fontWeight: 'bold' }}>{variation.name}</div>
                <div style={{ fontSize: 11, color: '#666' }}>
                  Value: {String(variation.value)}
                </div>
                {index === flagReference?.variationIndex && (
                  <div style={{ fontSize: 11, color: '#4caf50', marginTop: 4 }}>
                    ✓ Currently selected
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content Mapping Interface */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: 8 
        }}>
          <div style={{ fontWeight: 'bold', fontSize: 13 }}>🔗 Content Mappings</div>
          <button
            onClick={() => setIsCreatingMapping(!isCreatingMapping)}
            style={{
              padding: '4px 8px',
              fontSize: 11,
              backgroundColor: isCreatingMapping ? '#dc3545' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            {isCreatingMapping ? 'Cancel' : 'Add Mapping'}
          </button>
        </div>

        {/* Create New Mapping Form */}
        {isCreatingMapping && (
          <div style={{ 
            padding: 12, 
            backgroundColor: '#f8f9fa', 
            border: '1px solid #dee2e6', 
            borderRadius: 6, 
            marginBottom: 12 
          }}>
            <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 'bold' }}>Create New Content Mapping</div>
            
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', fontSize: 11, marginBottom: 4 }}>Flag:</label>
              <select
                value={newMapping.flagKey || ''}
                onChange={(e) => setNewMapping(prev => ({ ...prev, flagKey: e.target.value }))}
                style={{ width: '100%', padding: '4px', fontSize: 11 }}
              >
                <option value="">Select a flag</option>
                {flags.map(flag => (
                  <option key={flag.key} value={flag.key}>{flag.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', fontSize: 11, marginBottom: 4 }}>Variation:</label>
              <select
                value={newMapping.variationIndex || ''}
                onChange={(e) => setNewMapping(prev => ({ ...prev, variationIndex: parseInt(e.target.value) }))}
                style={{ width: '100%', padding: '4px', fontSize: 11 }}
              >
                <option value="">Select a variation</option>
                {newMapping.flagKey && flags.find(f => f.key === newMapping.flagKey)?.variations.map((variation, index) => (
                  <option key={variation._id} value={index}>{variation.name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={saveContentMapping}
              disabled={!newMapping.flagKey || newMapping.variationIndex === undefined}
              style={{
                padding: '6px 12px',
                fontSize: 11,
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                opacity: (!newMapping.flagKey || newMapping.variationIndex === undefined) ? 0.5 : 1
              }}
            >
              Save Mapping
            </button>
          </div>
        )}

        {/* Existing Mappings */}
        {contentMappings.length > 0 ? (
          <div style={{ fontSize: 12 }}>
            {contentMappings.map((mapping, index) => (
              <div 
                key={index}
                style={{ 
                  padding: 8, 
                  backgroundColor: '#fff',
                  border: '1px solid #dee2e6',
                  borderRadius: 4,
                  marginBottom: 6,
                  cursor: 'pointer'
                }}
                onClick={() => loadPreviewContent(mapping)}
              >
                <div style={{ fontWeight: 'bold' }}>
                  {flags.find(f => f.key === mapping.flagKey)?.name || mapping.flagKey}
                </div>
                <div style={{ fontSize: 11, color: '#666' }}>
                  Variation: {mapping.variationIndex} | 
                  Last Updated: {new Date(mapping.lastUpdated || '').toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ 
            padding: 8, 
            backgroundColor: '#f8f9fa', 
            border: '1px solid #dee2e6', 
            borderRadius: 4,
            fontSize: 11,
            color: '#666',
            textAlign: 'center'
          }}>
            No content mappings found. Create one to get started.
          </div>
        )}
      </div>

      {/* Content Preview */}
      {selectedMapping && previewContent && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 13 }}>
            👁️ Content Preview for "{selectedMapping.flagKey}"
          </div>
          <div style={{ 
            padding: 12, 
            backgroundColor: '#fff', 
            border: '1px solid #dee2e6', 
            borderRadius: 6 
          }}>
            {previewContent.type === 'text' && (
              <div style={{ 
                ...previewContent.style,
                fontSize: 14,
                lineHeight: 1.5
              }}>
                {previewContent.content}
              </div>
            )}
            
            {previewContent.type === 'image' && (
              <div>
                <img 
                  src={previewContent.imageUrl} 
                  alt={previewContent.alt}
                  style={{ maxWidth: '100%', height: 'auto', borderRadius: 4 }}
                />
                {previewContent.caption && (
                  <div style={{ fontSize: 11, color: '#666', marginTop: 4, textAlign: 'center' }}>
                    {previewContent.caption}
                  </div>
                )}
              </div>
            )}
            
            {previewContent.type === 'layout' && (
              <div style={{ fontSize: 12 }}>
                <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Layout: {previewContent.layout}</div>
                <div style={{ color: '#666' }}>{previewContent.description}</div>
              </div>
            )}
            
            {previewContent.type === 'mock' && (
              <div style={{ 
                padding: 8, 
                backgroundColor: '#fff3cd', 
                border: '1px solid #ffeaa7', 
                borderRadius: 4,
                fontSize: 12,
                color: '#856404'
              }}>
                {previewContent.content}
              </div>
            )}
            
            {previewContent.type === 'generic' && (
              <div style={{ fontSize: 12 }}>
                <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Content:</div>
                <div style={{ color: '#666' }}>{String(previewContent.content)}</div>
                {previewContent.description && (
                  <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                    {previewContent.description}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div style={{ 
          padding: 12, 
          backgroundColor: '#f8d7da', 
          border: '1px solid #f5c6cb', 
          borderRadius: 6, 
          marginBottom: 16,
          fontSize: 12,
          color: '#721c24'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>❌ Error</div>
          <div>{error}</div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div style={{ 
          padding: 12, 
          textAlign: 'center', 
          color: '#666',
          fontSize: 12
        }}>
          Loading LaunchDarkly data...
        </div>
      )}

      {/* Debug Info (collapsible) */}
      <details style={{ marginTop: 16, fontSize: 11 }}>
        <summary style={{ cursor: 'pointer', color: '#666' }}>🧪 Debug Info</summary>
        <div style={{ marginTop: 8, padding: 8, backgroundColor: '#f8f9fa', borderRadius: 4 }}>
          <div><strong>SDK Location:</strong> {sdk.location}</div>
          <div><strong>Flags Loaded:</strong> {flags.length}</div>
          <div><strong>Using Mock Data:</strong> {usingMockData ? 'Yes' : 'No'}</div>
          <div><strong>Flag Reference:</strong> {flagReference ? 'Found' : 'None'}</div>
          <div><strong>Selected Flag:</strong> {selectedFlag?.key || 'None'}</div>
          <div><strong>Variations:</strong> {variations.length}</div>
          <div><strong>Content Mappings:</strong> {contentMappings.length}</div>
          <div><strong>Selected Mapping:</strong> {selectedMapping ? 'Yes' : 'No'}</div>
          <div><strong>Preview Content:</strong> {previewContent ? 'Loaded' : 'None'}</div>
        </div>
      </details>
    </div>
  );
};

export default SidebarWidget;
