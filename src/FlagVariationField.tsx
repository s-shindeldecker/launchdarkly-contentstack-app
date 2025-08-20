import React, { useEffect, useState } from 'react';
import ContentstackAppSdk from '@contentstack/app-sdk';
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

// Type for installation parameters
type InstallationParams = {
  launchdarkly?: {
    apiKey?: string;
    projectKey?: string;
    environmentKey?: string;
  };
};

const FlagVariationField = () => {
  // 1. ALL useState hooks first - always called in same order
  const [sdk, setSdk] = useState<any>(null);
  const [flagKey, setFlagKey] = useState('');
  const [flags, setFlags] = useState<LaunchDarklyFlag[]>([]);
  const [variations, setVariations] = useState<LaunchDarklyVariation[]>([]);
  const [selected, setSelected] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [ldService, setLdService] = useState<LaunchDarklyService | null>(null);
  const [usingMockData, setUsingMockData] = useState(false);
  const [sdkInitialized, setSdkInitialized] = useState(false);
  const [installationParams, setInstallationParams] = useState<InstallationParams>({});

  // 2. ALL useEffect hooks second - always called in same order
  useEffect(() => {
    const initializeSDK = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Initialize the Contentstack App SDK
        const sdkInstance = await ContentstackAppSdk.init();
        setSdk(sdkInstance);
        setSdkInitialized(true);
        
        console.log('✅ SDK initialized successfully');
        console.log('📋 SDK instance keys:', Object.keys(sdkInstance));
        console.log('🔍 SDK location keys:', sdkInstance.location ? Object.keys(sdkInstance.location) : 'No location');
        
        // Check if we're in the right context for a custom field
        if (sdkInstance.location?.CustomField) {
          console.log('✅ CustomField location available');
          console.log('🔍 CustomField keys:', Object.keys(sdkInstance.location.CustomField));
          
          if (sdkInstance.location.CustomField.field) {
            console.log('✅ CustomField.field available');
            console.log('🔍 Field methods:', Object.getOwnPropertyNames(sdkInstance.location.CustomField.field));
            
            // Check if the field is in edit mode
            try {
              const fieldData = await sdkInstance.location.CustomField.field.getData();
              console.log('🔍 [Field Init] Current field data:', fieldData);
              console.log('🔍 [Field Init] Field data type:', typeof fieldData);
            } catch (fieldError) {
              console.log('⚠️ [Field Init] Could not get field data:', fieldError);
            }
          } else {
            console.log('❌ CustomField.field not available');
          }
        } else {
          console.log('❌ CustomField location NOT available');
          console.log('🔍 Available locations:', Object.keys(sdkInstance.location || {}));
          
          // Log all available location properties for debugging
          Object.keys(sdkInstance.location || {}).forEach(locationKey => {
            if (sdkInstance.location && sdkInstance.location[locationKey as keyof typeof sdkInstance.location]) {
              console.log(`🔍 Location ${locationKey}: Available`);
            }
          });
        }
        
        // 🧩 Step 1: Initial auto-resize after SDK initialization
        if ((sdkInstance as any).window && typeof (sdkInstance as any).window.updateHeight === 'function') {
          try {
            await (sdkInstance as any).window.updateHeight();
            console.log('📏 [Height] Initial height update completed');
          } catch (e) {
            console.log('⚠️ [Height] Initial height update failed:', e);
          }
        } else {
          console.log('⚠️ [Height] sdk.window.updateHeight not available');
        }
        
        // Try to get configuration from the SDK
        let rawParams = null;
        
        // Method 1: Try sdk.getConfig() - this should read the persistent installation configuration
        try {
          rawParams = await sdkInstance.getConfig();
          console.log("🔧 [SDK] getConfig() result:", rawParams);
          console.log("🔧 [SDK] getConfig() type:", typeof rawParams);
          console.log("🔧 [SDK] getConfig() keys:", rawParams ? Object.keys(rawParams) : 'null/undefined');
          
          // Check if getConfig returned the installation configuration
          if (rawParams && typeof rawParams === 'object') {
            console.log("🔧 [SDK] getConfig() has launchdarkly config:", !!rawParams.launchdarkly);
            if (rawParams.launchdarkly) {
              console.log("🔧 [SDK] getConfig() launchdarkly keys:", Object.keys(rawParams.launchdarkly));
            }
          }
        } catch (e) {
          console.log("❌ [SDK] getConfig() failed:", e);
        }
        
        // Method 2: Try AppConfigWidget.installation.getInstallationData() if available (config screen context only)
        if (!rawParams && sdkInstance.location?.AppConfigWidget?.installation) {
          try {
            const installationData = await sdkInstance.location.AppConfigWidget.installation.getInstallationData();
            console.log("🔧 [SDK] AppConfigWidget installation data:", installationData);
            
            // Extract configuration from both configuration and serverConfiguration
            rawParams = {
              launchdarkly: {
                apiKey: installationData?.serverConfiguration?.apiKey || '',
                projectKey: installationData?.configuration?.projectKey || '',
                environmentKey: installationData?.configuration?.environmentKey || ''
              }
            };
            console.log("🔧 [SDK] Extracted from AppConfigWidget:", rawParams);
          } catch (e) {
            console.log("❌ [SDK] AppConfigWidget.getInstallationData() failed:", e);
          }
        }
        
        // Method 3: Fallback to sdk.store.get() if other methods don't work
        if (!rawParams && sdkInstance.store && typeof sdkInstance.store.get === 'function') {
          try {
            rawParams = await sdkInstance.store.get('launchdarkly_config');
            console.log("🔧 [SDK] Fallback - store config (launchdarkly_config):", rawParams);
          } catch (e) {
            console.log("❌ [SDK] store.get('launchdarkly_config') failed:", e);
          }
        }
        
        console.log("🔧 [SDK] Final raw params:", rawParams);
        
        // Handle the case where rawParams might be an error object
        let processedParams = null;
        if (rawParams && typeof rawParams === 'object' && !rawParams.message) {
          // Valid params object
          processedParams = rawParams;
        } else if (rawParams && rawParams.message) {
          // Error object, log it but don't use it
          console.log("⚠️ [SDK] rawParams contains error:", rawParams.message);
          processedParams = null;
        } else {
          // No params or null
          processedParams = null;
        }
        
        const params: InstallationParams = {
          launchdarkly: {
            apiKey: processedParams?.launchdarkly?.apiKey || processedParams?.apiKey || '',
            projectKey: processedParams?.launchdarkly?.projectKey || processedParams?.projectKey || '',
            environmentKey: processedParams?.launchdarkly?.environmentKey || processedParams?.environmentKey || 'production'
          }
        };
        
        console.log("🔧 [SDK] Processed Installation Parameters:");
        console.log(params);
        
        console.log("🔧 [SDK] LaunchDarkly Configuration Details:");
        console.log("🔍 LD API Key:", params.launchdarkly?.apiKey || "❌ Not set");
        console.log("🔍 LD Project Key:", params.launchdarkly?.projectKey || "❌ Not set");
        console.log("🔍 LD Environment Key:", params.launchdarkly?.environmentKey || "❌ Not set");
        
        setInstallationParams(params);
        
        // Extract LaunchDarkly configuration from installation parameters
        const { launchdarkly } = params;
        let projectKey = launchdarkly?.projectKey || '';
        let environmentKey = launchdarkly?.environmentKey || 'production';
        let apiKey = launchdarkly?.apiKey || '';
        
        // Remove process.env fallbacks since they don't exist in browser
        // These would only work in a Node.js environment
        console.log("🔧 [FINAL] LaunchDarkly Configuration:");
        console.log("🔍 Final API Key:", apiKey || "❌ Not set");
        console.log("🔍 Final Project Key:", projectKey || "❌ Not set");
        console.log("🔍 Final Environment Key:", environmentKey || "❌ Not set");
        
        // Create LaunchDarkly service with the configuration
        if (projectKey && apiKey) {
          const ldService = new LaunchDarklyService(apiKey, projectKey, environmentKey);
          setLdService(ldService);
          console.log("✅ [SDK] LaunchDarkly service created with real configuration");
        } else {
          console.log("⚠️ Using mock data - LaunchDarkly project key not configured");
          setLdService(null);
        }
        
        try {
          // Check if we can access entry information through the SDK
          console.log("🔧 [SDK] Checking for entry data...");
          
          // Try to get entry info from the location context
          if (sdkInstance.location?.CustomField?.field) {
            try {
              const fieldData = await sdkInstance.location.CustomField.field.getData();
              console.log("📄 [SDK] Field Data:", fieldData);
              
              if (fieldData && typeof fieldData === 'object') {
                console.log("📄 [SDK] Field Entry ID:", fieldData.entryId || "❌ No Entry ID");
                console.log("📄 [SDK] Field Environment:", fieldData.environment || "❌ No Environment");
                console.log("📄 [SDK] Field Content Type:", fieldData.contentType || "❌ No Content Type");
              }
            } catch (fieldError) {
              console.log("📄 [SDK] Could not get field data:", fieldError);
            }
          } else {
            console.log("🔧 [SDK] Custom Field Location: ❌ Not available");
          }
          
          // Check if SDK has other entry-related properties
          console.log("🔧 [SDK] SDK Instance Keys:", Object.keys(sdkInstance));
          
          // Check for any entry-related properties on the SDK instance
          const entryRelatedKeys = ['entry', 'entryData', 'entryId', 'contentType', 'environment'];
          const foundKeys = entryRelatedKeys.filter(key => (sdkInstance as any)[key] !== undefined);
          
          if (foundKeys.length > 0) {
            console.log("🔧 [SDK] Found entry-related keys:", foundKeys);
            foundKeys.forEach(key => {
              try {
                console.log(`🔧 [SDK] ${key}:`, (sdkInstance as any)[key]);
              } catch (e) {
                console.log(`📄 [SDK] Could not access ${key}:`, e);
              }
            });
          } else {
            console.log("🔧 [SDK] Entry Object: ❌ No entry-related properties found on SDK instance");
          }
        } catch (entryError) {
          console.log("📄 [SDK] Error checking entry data:", entryError);
        }
      } catch (e: any) {
        console.error("❌ Failed to initialize SDK:", e);
        setError(e?.message || 'Failed to initialize SDK');
      } finally {
        setLoading(false);
      }
    };

    initializeSDK();
  }, []);

  // Listen for changes in installation parameters and update service accordingly
  useEffect(() => {
    if (sdkInitialized && installationParams.launchdarkly) {
      const { launchdarkly } = installationParams;
      const projectKey = launchdarkly.projectKey;
      const environmentKey = launchdarkly.environmentKey || 'production';
      const apiKey = launchdarkly.apiKey || 'mock-key';
      
      if (projectKey && projectKey.trim() !== '') {
        const newService = new LaunchDarklyService(apiKey, projectKey, environmentKey);
        setLdService(newService);
        setUsingMockData(false);
        console.log('🔄 Updated LaunchDarkly service with new config:', { projectKey, environmentKey });
        
        // Refresh flags with new configuration
        if (flags.length > 0) {
          fetchFlags();
        }
      } else {
        setLdService(new LaunchDarklyService('mock-key', 'demo', 'production'));
        setUsingMockData(true);
        console.log('🔄 Switched to mock data due to missing project key');
      }
    }
  }, [installationParams, sdkInitialized]);

  // 🧩 Step 2: Update height after content changes
  useEffect(() => {
    if (sdk && sdkInitialized) {
      // Update height after flags load
      if (flags.length > 0) {
        console.log('📏 [Height] Flags loaded, updating height...');
        updateHeight();
      }
      
      // Update height after variations load
      if (variations.length > 0) {
        console.log('📏 [Height] Variations loaded, updating height...');
        updateHeight();
      }
    }
  }, [flags, variations, sdk, sdkInitialized]);

  // 🧩 Step 3: Set up MutationObserver to detect content changes
  useEffect(() => {
    if (sdk && sdkInitialized) {
      let observer: MutationObserver | null = null;
      let handleResize: (() => void) | null = null;
      
      try {
        // Create observer to watch for DOM changes
        observer = new MutationObserver((mutations) => {
          console.log('📏 [Height] DOM mutation detected, updating height...');
          updateHeight();
        });
        
        // Observe the entire document body for changes
        observer.observe(document.body, { 
          childList: true, 
          subtree: true,
          attributes: true,
          attributeFilter: ['style', 'class']
        });
        
        console.log('📏 [Height] MutationObserver set up successfully');
        
        // Force multiple height updates with delays to ensure it works
        const heightUpdateAttempts = [100, 500, 1000, 2000];
        heightUpdateAttempts.forEach(delay => {
          setTimeout(() => {
            console.log(`📏 [Height] Forcing height update attempt after ${delay}ms...`);
            updateHeight();
          }, delay);
        });
        
        // Also listen for window resize events
        handleResize = () => {
          console.log('📏 [Height] Window resize detected, updating height...');
          updateHeight();
        };
        
        window.addEventListener('resize', handleResize);
        
      } catch (e) {
        console.log('⚠️ [Height] Failed to set up MutationObserver:', e);
      }
      
      // Clean up observer on unmount
      return () => {
        if (observer) {
          observer.disconnect();
          console.log('📏 [Height] MutationObserver disconnected');
        }
        if (handleResize) {
          window.removeEventListener('resize', handleResize);
        }
      };
    }
  }, [sdk, sdkInitialized]);

  // Load flags when component is ready
  useEffect(() => {
    if (sdkInitialized && ldService && flags.length === 0) {
      fetchFlags();
    }
  }, [sdkInitialized, ldService]);

  // Load saved field data when component is ready
  useEffect(() => {
    if (sdkInitialized && sdk?.location?.CustomField?.field && !flagKey) {
      const loadSavedData = async () => {
        try {
          const field = sdk.location.CustomField.field;
          const savedData = field.getData();
          console.log('📄 [Load] Saved field data:', savedData);
          
          if (savedData && typeof savedData === 'object') {
            // Check if we have saved flag data in different possible formats
            let foundFlagKey = null;
            let foundVariationId = null;
            
            // Format 1: Our POC structure
            if (savedData.flagKey) {
              foundFlagKey = savedData.flagKey;
              foundVariationId = savedData.variationId;
            }
            // Format 2: Simple structure
            else if (savedData.flag) {
              foundFlagKey = savedData.flag;
              foundVariationId = savedData.variationId;
            }
            // Format 3: Minimal structure
            else if (savedData.flagKey || savedData.flag) {
              foundFlagKey = savedData.flagKey || savedData.flag;
              foundVariationId = savedData.variationId;
            }
            
            if (foundFlagKey) {
              setFlagKey(foundFlagKey);
              console.log('📄 [Load] Restored flag key:', foundFlagKey);
              
              // Load variations for this flag
              if (ldService) {
                await fetchFlagVariations(foundFlagKey);
                
                // Restore variation selection if available
                if (foundVariationId && variations.length > 0) {
                  const variationIndex = variations.findIndex(v => v._id === foundVariationId);
                  if (variationIndex >= 0) {
                    setSelected(variationIndex);
                    console.log('📄 [Load] Restored variation selection:', variationIndex);
                  }
                }
              }
            } else {
              console.log('📄 [Load] No recognizable flag data found in saved data');
            }
          }
        } catch (error) {
          console.log('📄 [Load] Could not load saved data:', error);
        }
      };
      
      loadSavedData();
    }
  }, [sdkInitialized, sdk, ldService, variations.length]);

  // 3. ALL helper functions - defined after all hooks
  const updateHeight = async () => {
    if (sdk && (sdk as any).window && typeof (sdk as any).window.updateHeight === 'function') {
      try {
        await (sdk as any).window.updateHeight();
        console.log('📏 [Height] Height updated successfully via SDK');
      } catch (e) {
        console.log('⚠️ [Height] SDK height update failed:', e);
      }
    } else {
      // Manual height calculation since SDK window API is not available
      try {
        const bodyHeight = document.body.scrollHeight;
        const htmlHeight = document.documentElement.scrollHeight;
        const maxHeight = Math.max(bodyHeight, htmlHeight);
        
        console.log('📏 [Height] Manual height calculation:', {
          bodyHeight,
          htmlHeight,
          maxHeight
        });
        
        // Set iframe height by posting message to parent
        if (window.parent && window.parent !== window) {
          const heightMessage = {
            type: 'resize',
            height: maxHeight + 20 // Add some padding
          };
          
          window.parent.postMessage(heightMessage, '*');
          console.log('📏 [Height] Height message sent to parent:', heightMessage);
        } else {
          console.log('⚠️ [Height] No parent window found for height update');
        }
        
        // Also try to resize the iframe directly if possible
        const iframe = document.querySelector('iframe');
        if (iframe) {
          iframe.style.height = `${maxHeight + 20}px`;
          console.log('📏 [Height] Iframe height set directly:', iframe.style.height);
        }
        
      } catch (e) {
        console.log('⚠️ [Height] Manual height update failed:', e);
      }
    }
  };

  const fetchFlags = async () => {
    if (!ldService) return;

    setLoading(true);
    setError(null);

    try {
      let flagsList: LaunchDarklyFlag[];
      
      if (usingMockData) {
        flagsList = ldService.getMockFlags();
        console.log('�� Loading mock flags:', flagsList.map(f => f.key));
      } else {
        try {
          flagsList = await ldService.getFlags();
          console.log('�� Loading real flags:', flagsList.map(f => f.key));
        } catch (apiError: any) {
          console.error('❌ Real API failed, likely due to CSP:', apiError);
          
          // Check if this is a CSP/network error
          if (apiError.message?.includes('Failed to fetch') || 
              apiError.message?.includes('NetworkError') ||
              apiError.message?.includes('CSP') ||
              apiError.message?.includes('Content Security Policy')) {
            
            console.log('🔄 CSP blocked API call, falling back to mock data');
            setUsingMockData(true);
            setLdService(new LaunchDarklyService('mock-key', 'demo', 'production'));
            
            // Get mock flags from the new service
            const mockService = new LaunchDarklyService('mock-key', 'demo', 'production');
            flagsList = mockService.getMockFlags();
            
            setError('⚠️ Using mock data - Content Security Policy blocked API connection. Please configure Contentstack to allow connections to launchdarkly-contentstack-app.vercel.app');
          } else {
            // Re-throw if it's not a CSP issue
            throw apiError;
          }
        }
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
      
      // If we haven't already fallen back to mock data, do it now
      if (!usingMockData) {
        console.log('🔄 Falling back to mock data due to error');
        setUsingMockData(true);
        setLdService(new LaunchDarklyService('mock-key', 'demo', 'production'));
        const mockFlags = new LaunchDarklyService('mock-key', 'demo', 'production').getMockFlags();
        setFlags(mockFlags);
        setError('⚠️ Using mock data - API connection failed. This may be due to Content Security Policy restrictions.');
      } else {
        setError('Failed to load flags: ' + (err?.message || 'Unknown error'));
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
    
    // Update height after flag change
    updateHeight();
  };

  const handleSave = async () => {
    if (!sdk || !flagKey || variations.length === 0) return;
    
    try {
      console.log('💾 [Field Save] Starting field save...');
      console.log('💾 [Field Save] Flag key:', flagKey);
      console.log('💾 [Field Save] Selected variation:', variations[selected]);
      
      // Use SDK location to access the field
      const location = sdk.location;
      if (!location || !location.CustomField?.field) {
        console.error('❌ [Field Save] Field not found - SDK location not available');
        setError('Field not found - SDK location not available');
        return;
      }

      const field = location.CustomField.field;
      const selectedVariation = variations[selected];
      if (!selectedVariation) {
        console.error('❌ [Field Save] No variation selected');
        setError('No variation selected');
        return;
      }

      // Debug: Check what methods are available on the field
      console.log('🔍 [Field Save] Field object:', field);
      console.log('🔍 [Field Save] Field methods:', Object.getOwnPropertyNames(field));
      console.log('🔍 [Field Save] Field prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(field)));

      // Get entry information from SDK if available
      let entryId = 'unknown';
      let environment = 'production';
      let contentType = 'unknown';
      
      try {
        // Try to get entry info from field data
        const fieldData = field.getData();
        console.log('💾 [Field Save] Current field data:', fieldData);
        
        if (fieldData) {
          entryId = fieldData.entryId || 'unknown';
          environment = fieldData.environment || 'production';
          contentType = fieldData.contentType || 'unknown';
        }
        
        // Log what we found
        console.log("💾 [Field Save] Extracted Entry Info:", { entryId, environment, contentType });
      } catch (entryError) {
        console.log('⚠️ [Field Save] Could not get entry data from field:', entryError);
      }
      
      // Use default values if field data doesn't have the information
      if (entryId === 'unknown') {
        entryId = 'unknown-entry';
        environment = 'production';
        contentType = 'unknown-type';
        console.log("💾 [Field Save] Using default values for missing entry info");
      }

      // Create the saved value structure matching your POC
      const savedValue: SavedValue = {
        cmsType: 'contentstack',
        entryId,
        environment,
        contentType
      };

      // Also create a simpler structure that might be more compatible
      const simpleValue = {
        flagKey,
        variationName: selectedVariation.name,
        variationValue: selectedVariation.value,
        variationId: selectedVariation._id
      };

      // Create a minimal structure that just contains the essential info
      const minimalValue = {
        flag: flagKey,
        variation: selectedVariation.name,
        value: selectedVariation.value
      };

      // Create a string value as a last resort
      const stringValue = JSON.stringify(minimalValue);

      console.log('💾 [Field Save] About to save this value:', savedValue);
      console.log('💾 [Field Save] Simple value (fallback):', simpleValue);
      console.log('💾 [Field Save] Minimal value (fallback 2):', minimalValue);
      console.log('💾 [Field Save] String value (fallback 3):', stringValue);
      
      // Try to save to the field using SDK - try multiple formats
      try {
        await field.setData(savedValue);
        console.log('✅ [Field Save] Field data saved successfully with full structure');
      } catch (setDataError) {
        console.error('❌ [Field Save] Full structure failed:', setDataError);
        
        // Try the simple value structure
        try {
          await field.setData(simpleValue);
          console.log('✅ [Field Save] Field data saved using simple structure');
        } catch (simpleError) {
          console.error('❌ [Field Save] Simple structure also failed:', simpleError);
          
          // Try the minimal structure
          try {
            await field.setData(minimalValue);
            console.log('✅ [Field Save] Field data saved using minimal structure');
          } catch (minimalError) {
            console.error('❌ [Field Save] Minimal structure also failed:', minimalError);
            
            // Try the string value as a last resort
            try {
              await field.setData(stringValue);
              console.log('✅ [Field Save] Field data saved using string structure');
            } catch (stringError) {
              console.error('❌ [Field Save] String structure also failed:', stringError);
              
              // Try alternative save methods if setData fails
              if (typeof field.save === 'function') {
                try {
                  await field.save(minimalValue);
                  console.log('✅ [Field Save] Field data saved using save() method');
                } catch (saveError) {
                  console.error('❌ [Field Save] save() method also failed:', saveError);
                  throw saveError;
                }
              } else {
                throw stringError;
              }
            }
          }
        }
      }
      
      // Update height after saving
      updateHeight();
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      
      console.log('✅ [Field Save] Complete save process:', {
        flagKey,
        variation: selectedVariation.name,
        value: selectedVariation.value,
        entryInfo: { entryId, environment, contentType }
      });
    } catch (err: any) {
      console.error('❌ [Field Save] Error saving:', err);
      setError('Failed to save: ' + (err?.message || 'Unknown error'));
    }
  };

  const handleVariationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelected(parseInt(e.target.value));
    
    // Update height after variation change
    updateHeight();
  };

  // Display current configuration status
  const renderConfigStatus = () => {
    const { launchdarkly } = installationParams;
    
    if (!launchdarkly || !launchdarkly.projectKey) {
      return (
        <div style={{ 
          padding: 12, 
          backgroundColor: '#fff3cd', 
          border: '1px solid #ffeaa7', 
          borderRadius: 4, 
          fontSize: 12,
          marginBottom: 12
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>⚠️ Configuration Required</div>
          <div style={{ marginBottom: 8 }}>
            LaunchDarkly configuration is not set. Please configure the app in Contentstack to enable real API access.
          </div>
          <div style={{ fontSize: 11, color: '#666' }}>
            <strong>Required:</strong> Project Key, Environment Key
          </div>
        </div>
      );
    }
    
    if (usingMockData) {
      return (
        <div style={{ 
          padding: 12, 
          backgroundColor: '#fff3cd', 
          border: '1px solid #ffeaa7', 
          borderRadius: 4, 
          fontSize: 12,
          marginBottom: 12
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>⚠️ Using Mock Data</div>
          <div style={{ marginBottom: 8 }}>
            The app is currently using mock data because Contentstack's Content Security Policy is blocking connections to the LaunchDarkly API.
          </div>
          <div style={{ fontSize: 11, color: '#666' }}>
            <strong>To fix this:</strong> Configure Contentstack to allow connections to <code>launchdarkly-contentstack-app.vercel.app</code> in your CSP settings, or contact your Contentstack administrator.
          </div>
        </div>
      );
    }
    
    return (
      <div style={{ 
        padding: 12, 
        backgroundColor: '#d4edda', 
        border: '1px solid #c3e6cb', 
        borderRadius: 4, 
        fontSize: 12,
        marginBottom: 12
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: 4 }}>✅ Connected to LaunchDarkly</div>
        <div style={{ fontSize: 11, color: '#155724' }}>
          <strong>Project:</strong> {launchdarkly.projectKey} | <strong>Environment:</strong> {launchdarkly.environmentKey || 'production'}
        </div>
      </div>
    );
  };

  // Visual test component to show SDK configuration status
  const renderSDKTestStatus = () => {
    const { launchdarkly } = installationParams;
    
    return (
      <div style={{ 
        padding: 12, 
        backgroundColor: '#e7f3ff', 
        border: '1px solid #b3d9ff', 
        borderRadius: 4, 
        fontSize: 11,
        marginBottom: 12,
        fontFamily: 'monospace'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: 6, color: '#0066cc' }}>🧪 SDK Configuration Test</div>
        <div style={{ display: 'grid', gap: 4, fontSize: 10 }}>
          <div>
            <span style={{ color: '#666' }}>SDK Initialized:</span> 
            <span style={{ color: sdkInitialized ? '#0a7f36' : '#b00020' }}>
              {sdkInitialized ? '✅ Yes' : '❌ No'}
            </span>
          </div>
          <div>
            <span style={{ color: '#666' }}>SDK Instance:</span> 
            <span style={{ color: sdk ? '#0a7f36' : '#b00020' }}>
              {sdk ? '✅ Available' : '❌ Not Available'}
            </span>
          </div>
          <div>
            <span style={{ color: '#666' }}>Installation Params:</span> 
            <span style={{ color: Object.keys(installationParams).length > 0 ? '#0a7f36' : '#b00020' }}>
              {Object.keys(installationParams).length > 0 ? '✅ Loaded' : '❌ Not Loaded'}
            </span>
          </div>
          <div>
            <span style={{ color: '#666' }}>LD Project Key:</span> 
            <span style={{ color: launchdarkly?.projectKey ? '#0a7f36' : '#b00020' }}>
              {launchdarkly?.projectKey ? `✅ ${launchdarkly.projectKey}` : '❌ Not Set'}
            </span>
          </div>
          <div>
            <span style={{ color: '#666' }}>LD Environment:</span> 
            <span style={{ color: launchdarkly?.environmentKey ? '#0a7f36' : '#b00020' }}>
              {launchdarkly?.environmentKey ? `✅ ${launchdarkly.environmentKey}` : '❌ Not Set'}
            </span>
          </div>
          <div>
            <span style={{ color: '#666' }}>LD API Key:</span> 
            <span style={{ color: launchdarkly?.apiKey ? '#0a7f36' : '#b00020' }}>
              {launchdarkly?.apiKey ? '✅ Set' : '❌ Not Set'}
            </span>
          </div>
          <div>
            <span style={{ color: '#666' }}>Service Mode:</span> 
            <span style={{ color: usingMockData ? '#b00020' : '#0a7f36' }}>
              {usingMockData ? '⚠️ Mock Data' : '✅ Real API'}
            </span>
          </div>
        </div>
      </div>
    );
  };

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
            <span style={{ color: installationParams?.launchdarkly?.projectKey ? '#0a7f36' : '#b00020' }}>
              {installationParams?.launchdarkly?.projectKey ? `✅ ${installationParams.launchdarkly.projectKey}` : '❌ Not Set'}
            </span>
          </div>
          <div>
            <span style={{ color: '#666' }}>Environment Key:</span> 
            <span style={{ color: installationParams?.launchdarkly?.environmentKey ? '#0a7f36' : '#b00020' }}>
              {installationParams?.launchdarkly?.environmentKey ? `✅ ${installationParams.launchdarkly.environmentKey}` : '❌ Not Set'}
            </span>
          </div>
          <div>
            <span style={{ color: '#666' }}>API Key:</span> 
            <span style={{ color: installationParams?.launchdarkly?.apiKey ? '#0a7f36' : '#b00020' }}>
              {installationParams?.launchdarkly?.apiKey ? '✅ Set' : '❌ Not Set'}
            </span>
          </div>
          <div>
            <span style={{ color: '#666' }}>LD Service:</span> 
            <span style={{ color: ldService ? '#0a7f36' : '#b00020' }}>
              {ldService ? '✅ Available' : '❌ Not Available'}
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

  // 4. ALL early returns AFTER all hooks and functions are defined
  if (!sdkInitialized && loading) {
    return (
      <div style={{ padding: 16, textAlign: 'center' }}>
        <div>Initializing Contentstack App SDK...</div>
      </div>
    );
  }

  if (!sdkInitialized && error) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ color: '#b00020', marginBottom: 12 }}>SDK Initialization Error: {error}</div>
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

  // Check if we're in the right context for a custom field
  if (!sdk.location?.CustomField?.field) {
    return (
      <div style={{ padding: 16, textAlign: 'center' }}>
        <div style={{ color: '#b00020', marginBottom: 12, fontSize: 14 }}>
          ⚠️ Custom Field Context Not Available
        </div>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 16 }}>
          This app is designed to work as a custom field in Contentstack entries. 
          It appears you're viewing it in a different context.
        </div>
        <div style={{ fontSize: 11, color: '#999', backgroundColor: '#f8f9fa', padding: 8, borderRadius: 4 }}>
          <strong>Available locations:</strong> {sdk.location ? Object.keys(sdk.location).join(', ') : 'None'}
        </div>
        <div style={{ fontSize: 11, color: '#999', marginTop: 8 }}>
          To use this field, add it to a content type and create/edit an entry.
        </div>
        <button 
          onClick={() => window.location.reload()} 
          style={{ 
            padding: '8px 12px', 
            marginTop: 12,
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Reload Page
        </button>
      </div>
    );
  }

  // Check if we're in edit mode
  const isEditMode = sdk.location?.CustomField?.field && 
                     typeof sdk.location.CustomField.field.setData === 'function';
  
  // Try to load saved data even in read-only mode
  const [savedData, setSavedData] = useState<any>(null);
  
  useEffect(() => {
    if (sdk?.location?.CustomField?.field && !isEditMode) {
      try {
        const data = sdk.location.CustomField.field.getData();
        setSavedData(data);
      } catch (e) {
        console.log('Could not load saved data in read-only mode:', e);
      }
    }
  }, [sdk, isEditMode]);
  
  if (!isEditMode) {
    return (
      <div style={{ padding: 16, textAlign: 'center' }}>
        <div style={{ color: '#b00020', marginBottom: 12, fontSize: 14 }}>
          ⚠️ Field Not in Edit Mode
        </div>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 16 }}>
          The field appears to be in read-only mode. This can happen when:
        </div>
        <ul style={{ fontSize: 11, color: '#666', marginBottom: 16, textAlign: 'left', display: 'inline-block' }}>
          <li>The entry is in preview mode</li>
          <li>You don't have edit permissions</li>
          <li>The field is not properly configured</li>
        </ul>
        
        {savedData && (
          <div style={{ fontSize: 11, color: '#666', backgroundColor: '#f8f9fa', padding: 8, borderRadius: 4, marginBottom: 16 }}>
            <strong>Saved Data:</strong> {JSON.stringify(savedData, null, 2)}
          </div>
        )}
        
        <div style={{ fontSize: 11, color: '#999', backgroundColor: '#f8f9fa', padding: 8, borderRadius: 4 }}>
          <strong>Field methods available:</strong> {Object.getOwnPropertyNames(sdk.location.CustomField.field).join(', ')}
        </div>
      </div>
    );
  }

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

  // 5. Main render - always called after all hooks
  return (
    <div style={{ 
      padding: 8, 
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      maxHeight: '400px', // Respect Contentstack's iframe height
      overflow: 'auto' // Allow scrolling if needed
    }}>
      <div style={{ marginBottom: 12 }}>
        <h3 style={{ margin: '0 0 6px 0', fontSize: 14 }}>LaunchDarkly Flag Selection</h3>
        
        {/* Compact status display */}
        <div style={{ 
          display: 'grid', 
          gap: 8, 
          marginBottom: 12,
          fontSize: 10,
          backgroundColor: '#f8f9fa',
          padding: 8,
          borderRadius: 4,
          border: '1px solid #dee2e6'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Status:</span>
            <span style={{ color: '#0a7f36', fontWeight: 'bold' }}>✅ Connected</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Project:</span>
            <span style={{ fontWeight: 'bold' }}>{installationParams?.launchdarkly?.projectKey || 'Not set'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Environment:</span>
            <span style={{ fontWeight: 'bold' }}>{installationParams?.launchdarkly?.environmentKey || 'Not set'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Flags:</span>
            <span style={{ fontWeight: 'bold' }}>{flags.length} available</span>
          </div>
        </div>
        
        {/* Collapsible debug sections */}
        <details style={{ marginBottom: 8, fontSize: 10 }}>
          <summary style={{ cursor: 'pointer', color: '#666' }}>🧪 Debug Info</summary>
          <div style={{ marginTop: 4 }}>
            {renderConfigStatus()}
            {renderSDKTestStatus()}
            {renderConfigTestStatus()}
            
            {/* Field status section */}
            <div style={{ 
              padding: 12, 
              backgroundColor: '#e8f5e8', 
              border: '1px solid #4caf50', 
              borderRadius: 4, 
              fontSize: 11,
              marginTop: 12
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: 6, color: '#2e7d32' }}>🔍 Field Status</div>
              <div style={{ display: 'grid', gap: 4, fontSize: 10 }}>
                <div>
                  <span style={{ color: '#666' }}>Field Context:</span> 
                  <span style={{ color: sdk?.location?.CustomField ? '#0a7f36' : '#b00020' }}>
                    {sdk?.location?.CustomField ? '✅ Available' : '❌ Not Available'}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#666' }}>Field Object:</span> 
                  <span style={{ color: sdk?.location?.CustomField?.field ? '#0a7f36' : '#b00020' }}>
                    {sdk?.location?.CustomField?.field ? '✅ Available' : '❌ Not Available'}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#666' }}>Edit Mode:</span> 
                  <span style={{ color: isEditMode ? '#0a7f36' : '#b00020' }}>
                    {isEditMode ? '✅ Enabled' : '❌ Disabled'}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#666' }}>setData Method:</span> 
                  <span style={{ color: typeof sdk?.location?.CustomField?.field?.setData === 'function' ? '#0a7f36' : '#b00020' }}>
                    {typeof sdk?.location?.CustomField?.field?.setData === 'function' ? '✅ Available' : '❌ Not Available'}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#666' }}>getData Method:</span> 
                  <span style={{ color: typeof sdk?.location?.CustomField?.field?.getData === 'function' ? '#0a7f36' : '#b00020' }}>
                    {typeof sdk?.location?.CustomField?.field?.getData === 'function' ? '✅ Available' : '❌ Not Available'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Troubleshooting section */}
            <div style={{ 
              padding: 12, 
              backgroundColor: '#fff8e1', 
              border: '1px solid #ffcc02', 
              borderRadius: 4, 
              fontSize: 11,
              marginTop: 12
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: 6, color: '#f57c00' }}>🔧 Troubleshooting</div>
              <div style={{ marginBottom: 8 }}>
                <strong>If the field appears as "display only":</strong>
              </div>
              <ol style={{ margin: 0, paddingLeft: 16, fontSize: 10 }}>
                <li>Make sure the app is properly installed in Contentstack</li>
                <li>Check that the custom field is added to your content type</li>
                <li>Verify you're editing an entry (not just viewing)</li>
                <li>Try refreshing the page</li>
                <li>Check browser console for error messages</li>
                <li>Ensure you have edit permissions for the entry</li>
                <li>Check if the entry is in preview mode (switch to edit mode)</li>
              </ol>
              <div style={{ marginTop: 8, fontSize: 10, color: '#f57c00' }}>
                <strong>Note:</strong> The field must be added to a content type and used within an entry editor to work properly.
              </div>
            </div>
          </div>
        </details>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {/* Debug flag state */}
        <div style={{ 
          fontSize: 10, 
          backgroundColor: '#fff3cd', 
          padding: 4, 
          borderRadius: 2,
          border: '1px solid #ffeaa7'
        }}>
          Debug: Flags loaded: {flags.length} | Flag key: "{flagKey}" | Variations: {variations.length}
        </div>
        
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 12 }}>Select Flag:</span>
          <select 
            value={flagKey} 
            onChange={handleFlagChange}
            style={{ padding: 6, border: '1px solid #ccc', borderRadius: 4, fontSize: 12 }}
          >
            <option value="">Choose a flag...</option>
            {flags.map(flag => (
              <option key={flag.key} value={flag.key}>
                {flag.name} ({flag.key})
              </option>
            ))}
          </select>
          {flags.length === 0 && (
            <small style={{ color: '#666', fontSize: 10 }}>
              No flags available. Check debug info for details.
            </small>
          )}
        </label>

        {flagKey && variations.length > 0 && (
          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontSize: 12 }}>Select Variation:</span>
            <select 
              value={selected} 
              onChange={handleVariationChange}
              style={{ padding: 6, border: '1px solid #ccc', borderRadius: 4, fontSize: 12 }}
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
          <div style={{ color: '#b00020', fontSize: 11 }}>{error}</div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button 
            onClick={handleSave} 
            disabled={!flagKey || variations.length === 0}
            style={{ padding: '6px 10px', fontSize: 12 }}
          >
            Save Selection
          </button>
          {saved && <span style={{ color: '#0a7f36', fontSize: 11 }}>Saved ✓</span>}
          
          {/* Test field functionality button */}
          <button 
            onClick={() => {
              if (sdk?.location?.CustomField?.field) {
                const field = sdk.location.CustomField.field;
                console.log('🧪 [Test] Field object:', field);
                console.log('🧪 [Test] Field methods:', Object.getOwnPropertyNames(field));
                console.log('🧪 [Test] Field prototype:', Object.getPrototypeOf(field));
                
                // Try to get current data
                try {
                  const currentData = field.getData();
                  console.log('🧪 [Test] Current field data:', currentData);
                } catch (e) {
                  console.log('🧪 [Test] Could not get field data:', e);
                }
                
                // Try to set a test value
                try {
                  const testValue = { test: 'value', timestamp: Date.now() };
                  field.setData(testValue);
                  console.log('🧪 [Test] Test value set successfully:', testValue);
                } catch (e) {
                  console.log('🧪 [Test] Could not set test value:', e);
                }
              } else {
                console.log('🧪 [Test] No field available');
              }
            }}
            style={{ 
              padding: '4px 6px', 
              fontSize: 10, 
              backgroundColor: '#e3f2fd',
              border: '1px solid #2196f3',
              borderRadius: '4px',
              color: '#1976d2'
            }}
          >
            Test Field
          </button>
          
          {/* Manual height update button for debugging */}
          <button 
            onClick={() => {
              console.log('📏 [Manual] Height update button clicked');
              updateHeight();
            }}
            style={{ 
              padding: '4px 6px', 
              fontSize: 10, 
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '4px'
            }}
          >
            Fix Height
          </button>
        </div>
      </div>
    </div>
  );
};

export default FlagVariationField;