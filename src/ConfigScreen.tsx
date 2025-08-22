import React, { useEffect, useState } from 'react';
import ContentstackAppSdk from '@contentstack/app-sdk';

// Type for installation parameters
type InstallationParams = {
  launchdarkly?: {
    apiKey?: string;
    projectKey?: string;
    environmentKey?: string;
  };
};

const ConfigScreen: React.FC = () => {
  const [sdk, setSdk] = useState<any>(null);
  const [projectKey, setProjectKey] = useState('');
  const [environmentKey, setEnvironmentKey] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installationParams, setInstallationParams] = useState<InstallationParams | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const instance: any = await ContentstackAppSdk.init();
        setSdk(instance);
        
        console.log("🔧 [ConfigScreen] SDK initialized successfully");
        console.log("🔧 [ConfigScreen] SDK object keys:", Object.keys(instance));
        
        // Try to get configuration from AppConfigWidget.installation (persistent storage)
        let rawParams = null;
        
        // Method 1: Use AppConfigWidget.installation.getInstallationData() - this is persistent
        if (instance.location?.AppConfigWidget?.installation) {
          try {
            const installationData = await instance.location.AppConfigWidget.installation.getInstallationData();
            console.log("🔧 [ConfigScreen] AppConfigWidget installation data:", installationData);
            
            // Extract configuration from both configuration and serverConfiguration
            rawParams = {
              launchdarkly: {
                apiKey: installationData?.serverConfiguration?.apiKey || '',
                projectKey: installationData?.configuration?.projectKey || '',
                environmentKey: installationData?.configuration?.environmentKey || ''
              }
            };
            console.log("🔧 [ConfigScreen] Extracted from AppConfigWidget:", rawParams);
          } catch (e) {
            console.log("❌ [ConfigScreen] AppConfigWidget.getInstallationData() failed:", e);
          }
        }
        
        // Method 2: Fallback to old methods if AppConfigWidget doesn't work
        if (!rawParams) {
          try {
            rawParams = await instance.getConfig();
            console.log("🔧 [ConfigScreen] Fallback - getConfig():", rawParams);
          } catch (e) {
            console.log("❌ [ConfigScreen] getConfig() failed:", e);
          }
        }
        
        console.log("🔧 [ConfigScreen] Final raw params:", rawParams);
        
        const params: InstallationParams = {
          launchdarkly: {
            apiKey: rawParams?.launchdarkly?.apiKey || '',
            projectKey: rawParams?.launchdarkly?.projectKey || '',
            environmentKey: rawParams?.launchdarkly?.environmentKey || 'production'
          }
        };
        
        console.log("🔧 [ConfigScreen] Processed Installation Parameters:");
        console.log(params);
        
        console.log("🔍 [ConfigScreen] LaunchDarkly Configuration Details:");
        console.log("🔍 LD API Key:", params.launchdarkly?.apiKey || "❌ Not set");
        console.log("🔍 LD Project Key:", params.launchdarkly?.projectKey || "❌ Not set");
        console.log("🔍 LD Environment Key:", params.launchdarkly?.environmentKey || "❌ Not set");
        
        setInstallationParams(params);
        
        // Extract LaunchDarkly configuration from installation parameters
        const { launchdarkly } = params;
        
        setProjectKey(launchdarkly?.projectKey || '');
        setEnvironmentKey(launchdarkly?.environmentKey || '');
        setApiKey(launchdarkly?.apiKey || '');
        setLoading(false);
      } catch (e: any) {
        console.error("❌ [ConfigScreen] Failed to initialize SDK:", e);
        setError(e?.message || 'Failed to initialize');
        setLoading(false);
      }
    })();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sdk) {
      console.error('❌ [ConfigScreen] Cannot save - SDK not available');
      setError('SDK not available - cannot save configuration');
      return;
    }

    setError(null);
    
    try {
      console.log("💾 [ConfigScreen] Starting save process...");
      console.log(" [ConfigScreen] New values:", { 
        projectKey, 
        environmentKey, 
        apiKey: apiKey ? '***SET***' : '❌ Not set' 
      });
      
      // Create the new configuration object
      const newConfig = {
        launchdarkly: {
          apiKey: apiKey.trim(),
          projectKey: projectKey.trim(),
          environmentKey: environmentKey.trim()
        }
      };
      
      console.log(" [ConfigScreen] New configuration to save:", newConfig);
      
      // Try to save using Contentstack's persistent storage
      let saveSuccess = false;
      
      // Method 1: Use AppConfigWidget.installation.setInstallationData() - this is persistent
      if (sdk.location?.AppConfigWidget?.installation) {
        try {
          console.log("💾 [ConfigScreen] Attempting to save via AppConfigWidget.installation.setInstallationData()...");
          
          // Save configuration to AppConfigWidget.installation
          await sdk.location.AppConfigWidget.installation.setInstallationData({
            configuration: {
              projectKey: projectKey.trim(),
              environmentKey: environmentKey.trim()
            },
            serverConfiguration: {
              apiKey: apiKey.trim()
            }
          });
          
          console.log("✅ [ConfigScreen] Configuration saved via AppConfigWidget.installation.setInstallationData()");
          saveSuccess = true;
        } catch (e) {
          console.error("❌ [ConfigScreen] AppConfigWidget.installation.setInstallationData() failed:", e);
        }
      }
      
      // Method 2: Fallback to sdk.store if AppConfigWidget doesn't work
      if (!saveSuccess && sdk.store && typeof sdk.store.set === 'function') {
        try {
          console.log("💾 [ConfigScreen] Fallback - attempting to save via sdk.store.set()...");
          await sdk.store.set('launchdarkly_config', newConfig);
          console.log("⚠️ [ConfigScreen] Configuration saved via sdk.store.set() (NOT PERSISTENT)");
          saveSuccess = true;
        } catch (e) {
          console.error("❌ [ConfigScreen] sdk.store.set() failed:", e);
        }
      }
      
      // Method 3: Update local SDK config as fallback (but warn it's not persistent)
      if (!saveSuccess) {
        try {
          sdk.config = newConfig;
          console.log("⚠️ [ConfigScreen] Updated local sdk.config (NOT PERSISTENT)");
          console.log("⚠️ [ConfigScreen] This configuration will NOT be available to other components");
          console.log("⚠️ [ConfigScreen] The custom field will NOT be able to access this configuration");
        } catch (e) {
          console.error("❌ [ConfigScreen] Even local config update failed:", e);
        }
      }
      
      if (!saveSuccess) {
        console.warn("⚠️ [ConfigScreen] Could not persist configuration to Contentstack");
        setError("Configuration could not be persisted. The custom field may not work properly.");
      } else if (sdk.location?.AppConfigWidget?.installation) {
        console.log("✅ [ConfigScreen] Configuration successfully persisted via AppConfigWidget!");
        setError(null);
      } else {
        console.warn("⚠️ [ConfigScreen] Configuration saved but NOT persistent (using fallback methods)");
        setError("Configuration saved locally but may not persist across app saves.");
      }
      
      // Verify the save by reading back from AppConfigWidget
      let verifyParams = null;
      if (saveSuccess && sdk.location?.AppConfigWidget?.installation) {
        try {
          const installationData = await sdk.location.AppConfigWidget.installation.getInstallationData();
          console.log("🔍 [ConfigScreen] Verification - read back from AppConfigWidget:", installationData);
          verifyParams = installationData;
        } catch (e) {
          console.log("❌ [ConfigScreen] AppConfigWidget verification failed:", e);
        }
      }
      
      setSaved(true);
      setDirty(false);
      setTimeout(() => setSaved(false), 2000);
      
    } catch (e: any) {
      console.error("❌ [ConfigScreen] Failed to save configuration:", e);
      setError(e?.message || 'Failed to save');
    }
  };

  const onChangeProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProjectKey(e.target.value);
    setDirty(true);
  };

  const onChangeEnv = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEnvironmentKey(e.target.value);
    setDirty(true);
  };

  const onChangeApiKey = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value);
    setDirty(true);
  };

  if (loading) return <div style={{ padding: 16 }}>Loading...</div>;

  // Debug: Check if we're actually rendering
  console.log('🔍 [ConfigScreen] Rendering component with state:', {
    loading,
    sdk: !!sdk,
    projectKey,
    environmentKey,
    apiKey: apiKey ? '***SET***' : '❌ Not set',
    error
  });

  // Visual test component to show current configuration status
  const renderConfigTestStatus = () => {
    return (
      <div style={{ 
        padding: 12, 
        backgroundColor: '#e7f3ff', 
        border: '1px solid #b3d9ff', 
        borderRadius: 4, 
        fontSize: 11,
        marginBottom: 16,
        fontFamily: 'monospace'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: 6, color: '#0066cc' }}>🧪 Current Configuration Test</div>
        <div style={{ display: 'grid', gap: 4, fontSize: 10 }}>
          <div>
            <span style={{ color: '#666' }}>SDK Instance:</span> 
            <span style={{ color: sdk ? '#0a7f36' : '#b00020' }}>
              {sdk ? '✅ Available' : '❌ Not Available'}
            </span>
          </div>
          <div>
            <span style={{ color: '#666' }}>AppConfigWidget:</span> 
            <span style={{ color: sdk?.location?.AppConfigWidget?.installation ? '#0a7f36' : '#b00020' }}>
              {sdk?.location?.AppConfigWidget?.installation ? '✅ Available (Persistent)' : '❌ Not Available'}
            </span>
          </div>
          <div>
            <span style={{ color: '#666' }}>Project Key:</span> 
            <span style={{ color: projectKey ? '#0a7f36' : '#b00020' }}>
              {projectKey ? `✅ ${projectKey}` : '❌ Not Set'}
            </span>
          </div>
          <div>
            <span style={{ color: '#666' }}>Environment Key:</span> 
            <span style={{ color: environmentKey ? '#0a7f36' : '#b00020' }}>
              {environmentKey ? `✅ ${environmentKey}` : '❌ Not Set'}
            </span>
          </div>
          <div>
            <span style={{ color: '#666' }}>API Key:</span> 
            <span style={{ color: apiKey ? '#0a7f36' : '#b00020' }}>
              {apiKey ? '✅ Set' : '❌ Not Set'}
            </span>
          </div>
          <div>
            <span style={{ color: '#666' }}>Form Dirty:</span> 
            <span style={{ color: dirty ? '#b00020' : '#0a7f36' }}>
              {dirty ? '⚠️ Has Changes' : '✅ No Changes'}
            </span>
          </div>
          <div>
            <span style={{ color: '#666' }}>Storage Method:</span> 
            <span style={{ color: sdk?.location?.AppConfigWidget?.installation ? '#0a7f36' : '#b00020' }}>
              {sdk?.location?.AppConfigWidget?.installation ? '✅ AppConfigWidget (Persistent)' : '⚠️ Fallback (Not Persistent)'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Add error boundary for rendering
  try {
    return (
      <div style={{ padding: 16, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
        <h2 style={{ marginBottom: 12 }}>LaunchDarkly Configuration</h2>
        {renderConfigTestStatus()}
      
      {/* Configuration Input Fields */}
      <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
        <label style={{ display: 'grid', gap: 6 }} htmlFor="projectKey">
          <span>LaunchDarkly Project Key</span>
          <input
            id="projectKey"
            type="text"
            value={projectKey}
            onChange={onChangeProject}
            placeholder="e.g. website"
            style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
          />
        </label>
        <label style={{ display: 'grid', gap: 6 }} htmlFor="environmentKey">
          <span>LaunchDarkly Environment Key</span>
          <input
            id="environmentKey"
            type="text"
            value={environmentKey}
            onChange={onChangeEnv}
            placeholder="e.g. production"
            style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
          />
        </label>
        <label style={{ display: 'grid', gap: 6 }} htmlFor="apiKey">
          <span>LaunchDarkly API Key (Optional)</span>
          <input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={onChangeApiKey}
            placeholder="Leave empty to use environment variable"
            style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
          />
          <small style={{ fontSize: 11, color: '#666' }}>
            If not provided, the app will use the LAUNCHDARKLY_API_KEY environment variable
          </small>
        </label>
        {error && <div style={{ color: '#b00020' }}>{error}</div>}
        
        {/* Save Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button 
            onClick={async () => {
              // Call the same logic that was in onSubmit
              if (!sdk) {
                console.error('❌ [ConfigScreen] Cannot save - SDK not available');
                setError('SDK not available - cannot save configuration');
                return;
              }

              setError(null);
              
              try {
                console.log("💾 [ConfigScreen] Starting save process...");
                console.log(" [ConfigScreen] New values:", { 
                  projectKey, 
                  environmentKey, 
                  apiKey: apiKey ? '***SET***' : '❌ Not set' 
                });
                
                // Create the new configuration object
                const newConfig = {
                  launchdarkly: {
                    apiKey: apiKey.trim(),
                    projectKey: projectKey.trim(),
                    environmentKey: environmentKey.trim()
                  }
                };
                
                console.log(" [ConfigScreen] New configuration to save:", newConfig);
                
                // Try to save using Contentstack's persistent storage
                let saveSuccess = false;
                
                // Method 1: Use AppConfigWidget.installation.setInstallationData() - this is persistent
                if (sdk.location?.AppConfigWidget?.installation) {
                  try {
                    console.log("💾 [ConfigScreen] Attempting to save via AppConfigWidget.installation.setInstallationData()...");
                    
                    // Save configuration to AppConfigWidget.installation
                    await sdk.location.AppConfigWidget.installation.setInstallationData({
                      configuration: {
                        projectKey: projectKey.trim(),
                        environmentKey: environmentKey.trim()
                      },
                      serverConfiguration: {
                        apiKey: apiKey.trim()
                      }
                    });
                    
                    console.log("✅ [ConfigScreen] Configuration saved via AppConfigWidget.installation.setInstallationData()");
                    saveSuccess = true;
                  } catch (e) {
                    console.error("❌ [ConfigScreen] AppConfigWidget.installation.setInstallationData() failed:", e);
                  }
                }
                
                // Method 2: Fallback to sdk.store if AppConfigWidget doesn't work
                if (!saveSuccess && sdk.store && typeof sdk.store.set === 'function') {
                  try {
                    console.log("💾 [ConfigScreen] Fallback - attempting to save via sdk.store.set()...");
                    await sdk.store.set('launchdarkly_config', newConfig);
                    console.log("⚠️ [ConfigScreen] Configuration saved via sdk.store.set() (NOT PERSISTENT)");
                    saveSuccess = true;
                  } catch (e) {
                    console.error("❌ [ConfigScreen] sdk.store.set() failed:", e);
                  }
                }
                
                // Method 3: Update local SDK config as fallback (but warn it's not persistent)
                if (!saveSuccess) {
                  try {
                    sdk.config = newConfig;
                    console.log("⚠️ [ConfigScreen] Updated local sdk.config (NOT PERSISTENT)");
                    console.log("⚠️ [ConfigScreen] This configuration will NOT be available to other components");
                    console.log("⚠️ [ConfigScreen] The custom field will NOT be able to access this configuration");
                  } catch (e) {
                    console.error("❌ [ConfigScreen] Even local config update failed:", e);
                  }
                }
                
                if (!saveSuccess) {
                  console.warn("⚠️ [ConfigScreen] Could not persist configuration to Contentstack");
                  setError("Configuration could not be persisted. The custom field may not work properly.");
                } else if (sdk.location?.AppConfigWidget?.installation) {
                  console.log("✅ [ConfigScreen] Configuration successfully persisted via AppConfigWidget!");
                  setError(null);
                } else {
                  console.warn("⚠️ [ConfigScreen] Configuration saved but NOT persistent (using fallback methods)");
                  setError("Configuration saved locally but may not persist across app saves.");
                }
                
                // Verify the save by reading back from AppConfigWidget
                let verifyParams = null;
                if (saveSuccess && sdk.location?.AppConfigWidget?.installation) {
                  try {
                    const installationData = await sdk.location.AppConfigWidget.installation.getInstallationData();
                    console.log("🔍 [ConfigScreen] Verification - read back from AppConfigWidget:", installationData);
                    verifyParams = installationData;
                  } catch (e) {
                    console.log("❌ [ConfigScreen] AppConfigWidget verification failed:", e);
                  }
                }
                
                setSaved(true);
                setDirty(false);
                setTimeout(() => setSaved(false), 2000);
                
              } catch (e: any) {
                console.error("❌ [ConfigScreen] Failed to save configuration:", e);
                setError(e?.message || 'Failed to save');
              }
            }}
            disabled={!dirty} 
            style={{ padding: '8px 12px' }}
          >
            Save
          </button>
          {saved && <span style={{ color: '#0a7f36' }}>Saved ✓</span>}
        </div>
      </div>
      
      {/* Manual Save Test Button */}
      <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f8f9fa', borderRadius: 4 }}>
        <h4 style={{ margin: '0 0 8px 0' }}>Manual Save Test:</h4>
        <button 
          onClick={async () => {
            console.log('🧪 [Manual Test] Button clicked');
            console.log('🧪 [Manual Test] SDK state:', { 
              sdk: !!sdk, 
              loading 
            });
            
            if (loading) {
              console.log('⏳ [Manual Test] Still loading, please wait...');
              return;
            }
            
            if (!sdk) {
              console.error('❌ [Manual Test] SDK instance not available');
              return;
            }
            
            try {
              console.log('🧪 [Manual Test] Testing save...');
              const testConfig = {
                configuration: {
                  projectKey: 'test-project',
                  environmentKey: 'test-env'
                },
                serverConfiguration: {
                  apiKey: 'test-api-key'
                }
              };
              
              console.log('🧪 [Manual Test] Saving test config:', testConfig);
              
              // Try different save methods
              let saveSuccess = false;
              
              // Method 1: Try AppConfigWidget.installation.setInstallationData() - this should persist
              if (sdk.location?.AppConfigWidget?.installation) {
                try {
                  console.log('🧪 [Manual Test] Attempting to save via AppConfigWidget.installation.setInstallationData()...');
                  await sdk.location.AppConfigWidget.installation.setInstallationData(testConfig);
                  console.log('✅ [Manual Test] Saved via AppConfigWidget.installation.setInstallationData()');
                  saveSuccess = true;
                } catch (e) {
                  console.log('❌ [Manual Test] AppConfigWidget.installation.setInstallationData() failed:', e);
                }
              }
              
              // Method 2: Try sdk.store.set() as fallback
              if (!saveSuccess && sdk.store && typeof sdk.store.set === 'function') {
                try {
                  console.log('🧪 [Manual Test] Fallback - attempting to save via sdk.store.set()...');
                  await sdk.store.set('launchdarkly_config', testConfig);
                  console.log('⚠️ [Manual Test] Saved via sdk.store.set() (NOT PERSISTENT)');
                  saveSuccess = true;
                } catch (e) {
                  console.log('❌ [Manual Test] sdk.store.set() failed:', e);
                }
              }
              
              // Method 3: Update local SDK config as fallback
              if (!saveSuccess) {
                try {
                  sdk.config = testConfig;
                  console.log('⚠️ [Manual Test] Updated local sdk.config (NOT PERSISTENT)');
                } catch (e) {
                  console.log('❌ [Manual Test] Even local config update failed:', e);
                }
              }
              
              // Try to read back the configuration from AppConfigWidget
              let readBack = null;
              if (saveSuccess && sdk.location?.AppConfigWidget?.installation) {
                try {
                  readBack = await sdk.location.AppConfigWidget.installation.getInstallationData();
                  console.log(' [Manual Test] Read back from AppConfigWidget:', readBack);
                } catch (e) {
                  console.log('❌ [Manual Test] AppConfigWidget read back failed:', e);
                }
              }
              
              // Also try getConfig() to see if it's updated
              try {
                const configReadBack = await sdk.getConfig();
                console.log(' [Manual Test] Read back from getConfig():', configReadBack);
              } catch (e) {
                console.log('❌ [Manual Test] getConfig() read back failed:', e);
              }
              
              console.log('✅ [Manual Test] Manual save test completed! Check console for details.');
            } catch (err: any) {
              console.error('❌ [Manual Test] Failed:', err);
              console.error('❌ [Manual Test] Error details:', err.message);
            }
          }}
          disabled={loading}
          style={{ 
            padding: '8px 12px', 
            backgroundColor: loading ? '#ccc' : '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: 4,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Loading...' : 'Test Save Manually'}
        </button>
        
        {/* SDK Exploration Button */}
        <button 
          onClick={() => {
            if (!sdk) {
              console.error('❌ [SDK Explore] SDK not available');
              return;
            }
            
            console.log('🔍 [SDK Explore] === SDK EXPLORATION START ===');
            console.log('🔍 [SDK Explore] SDK Type:', typeof sdk);
            console.log('🔍 [SDK Explore] SDK Constructor:', sdk.constructor?.name);
            console.log('🔍 [SDK Explore] SDK Prototype:', Object.getPrototypeOf(sdk));
            
            console.log('🔍 [SDK Explore] === SDK PROPERTIES ===');
            console.log('🔍 [SDK Explore] All properties:', Object.keys(sdk));
            
            console.log('🔍 [SDK Explore] === SDK METHODS ===');
            const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(sdk));
            console.log('🔍 [SDK Explore] All methods:', methods);
            
            console.log('🔍 [SDK Explore] === SDK VALUES ===');
            console.log('🔍 [SDK Explore] sdk.ids:', sdk.ids);
            console.log('🔍 [SDK Explore] sdk.config:', sdk.config);
            console.log('🔍 [SDK Explore] sdk.metadata:', sdk.metadata);
            console.log('🔍 [SDK Explore] sdk.store:', sdk.store);
            console.log('🔍 [SDK Explore] sdk.location:', sdk.location);
            
            console.log('🔍 [SDK Explore] === SDK EXPLORATION END ===');
          }}
          style={{ 
            marginLeft: 8,
            padding: '8px 12px', 
            backgroundColor: '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          Explore SDK
        </button>
        
        <small style={{ display: 'block', marginTop: 8, color: '#666' }}>
          These buttons test SDK functionality and explore available methods. Check console for results.
        </small>
        {loading && (
          <div style={{ marginTop: 8, color: '#666', fontSize: 11 }}>
            ⏳ SDK is still initializing, please wait...
          </div>
        )}
      </div>
      <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f8f9fa', borderRadius: 4, fontSize: 12 }}>
        <h4 style={{ margin: '0 0 8px 0' }}>Configuration Notes:</h4>
        <ul style={{ margin: 0, paddingLeft: 16 }}>
          <li><strong>Project Key:</strong> Required - Your LaunchDarkly project identifier</li>
          <li><strong>Environment Key:</strong> Required - The environment (e.g., production, staging)</li>
          <li><strong>API Key:</strong> Optional - Will use environment variable if not set here</li>
        </ul>
        <p style={{ margin: '8px 0 0 0', color: '#666' }}>
          After saving, the custom field extension will automatically use these settings.
        </p>
      </div>
    </div>
    );
  } catch (error) {
    console.error('❌ [ConfigScreen] Rendering error:', error);
    return (
      <div style={{ padding: 16, color: '#b00020', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
        <h2>Error Rendering Config Screen</h2>
        <p>An error occurred while rendering the configuration screen:</p>
        <pre style={{ backgroundColor: '#f8f9fa', padding: 8, borderRadius: 4, fontSize: 12 }}>
          {error instanceof Error ? error.message : String(error)}
        </pre>
        <p>Please check the browser console for more details.</p>
      </div>
    );
  }
};

export default ConfigScreen; 