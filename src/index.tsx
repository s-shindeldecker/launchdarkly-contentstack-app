import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import ContentstackAppSdk from '@contentstack/app-sdk';
import FlagVariationField from './FlagVariationField';
import ConfigScreen from './ConfigScreen';
import SidebarWidget from './SidebarWidget';
import './styles.css';

const App: React.FC = () => {
  const [sdk, setSdk] = useState<any>(null);
  const [sdkLocation, setSdkLocation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if we're in development mode (localhost)
  const isDevelopment = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize the Contentstack App SDK
        const sdkInstance = await ContentstackAppSdk.init();
        setSdk(sdkInstance);
        
        // Determine the app context based on SDK location
        // Check which location context is available
        let location = null;
        
        console.log('🔍 [App] SDK location object:', sdkInstance.location);
        console.log('🔍 [App] SDK location keys:', sdkInstance.location ? Object.keys(sdkInstance.location) : 'No location');
        
        if (sdkInstance.location?.SidebarWidget) {
          location = 'SidebarWidget';
          console.log('✅ [App] Detected SidebarWidget context');
        } else if (sdkInstance.location?.CustomField) {
          location = 'CustomField';
          console.log('✅ [App] Detected CustomField context');
          console.log('🔍 [App] CustomField object:', sdkInstance.location.CustomField);
          console.log('🔍 [App] CustomField keys:', Object.keys(sdkInstance.location.CustomField));
        } else if (sdkInstance.location?.AppConfigWidget) {
          location = 'AppConfigWidget';
          console.log('✅ [App] Detected AppConfigWidget context');
        } else {
          console.log('❌ [App] No recognized location context found');
          console.log('🔍 [App] Available locations:', sdkInstance.location ? Object.keys(sdkInstance.location) : 'None');
        }
        
        setSdkLocation(location);
        
        console.log('✅ [App] SDK initialized successfully');
        console.log('🔍 [App] Final SDK location:', location);
        
        setLoading(false);
      } catch (error) {
        console.error('❌ [App] Failed to initialize SDK:', error);
        setLoading(false);
      }
    };

    // Skip SDK initialization in development mode
    if (isDevelopment) {
      setLoading(false);
      return;
    }

    initializeApp();
  }, [isDevelopment]);

  // Determine which component to render based on context
  const renderComponent = () => {
    // Show development interface when running locally
    if (isDevelopment) {
      return (
        <div style={{ 
          padding: 20, 
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          <div style={{ 
            backgroundColor: '#e3f2fd', 
            border: '1px solid #2196f3', 
            borderRadius: 8, 
            padding: 16, 
            marginBottom: 20 
          }}>
            <h2 style={{ margin: '0 0 12px 0', color: '#1976d2' }}>🚀 LaunchDarkly Contentstack App</h2>
            <p style={{ margin: 0, color: '#1976d2' }}>
              This app is designed to run within Contentstack as a Custom Field or Sidebar Widget.
            </p>
          </div>

          <div style={{ 
            backgroundColor: '#fff3cd', 
            border: '1px solid #ffeaa7', 
            borderRadius: 8, 
            padding: 16, 
            marginBottom: 20 
          }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#856404' }}>⚠️ Development Mode</h3>
            <p style={{ margin: 0, color: '#856404' }}>
              You're running this app locally. The Contentstack App SDK requires a parent window context to function properly.
            </p>
          </div>

          <div style={{ 
            backgroundColor: '#f8f9fa', 
            border: '1px solid #dee2e6', 
            borderRadius: 8, 
            padding: 16, 
            marginBottom: 20 
          }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#495057' }}>🧪 Testing Components</h3>
            <p style={{ margin: '0 0 16px 0', color: '#495057' }}>
              You can test individual components here, but they won't have full SDK functionality:
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ 
                padding: 16, 
                backgroundColor: 'white', 
                border: '1px solid #dee2e6', 
                borderRadius: 6 
              }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#495057' }}>🔗 Sidebar Widget</h4>
                <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#666' }}>
                  Content mapping and preview interface
                </p>
                <button 
                  onClick={() => window.location.href = '/flag-selector.html'}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer'
                  }}
                >
                  Test Sidebar Widget
                </button>
              </div>

              <div style={{ 
                padding: 16, 
                backgroundColor: 'white', 
                border: '1px solid #dee2e6', 
                borderRadius: 6 
              }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#495057' }}>⚙️ Config Screen</h4>
                <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#666' }}>
                  App configuration interface
                </p>
                <button 
                  onClick={() => window.location.href = '/config-screen.html'}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer'
                  }}
                >
                  Test Config Screen
                </button>
              </div>
            </div>
          </div>

          <div style={{ 
            backgroundColor: '#f8f9fa', 
            border: '1px solid #dee2e6', 
            borderRadius: 8, 
            padding: 16 
          }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#495057' }}>📚 How to Test in Contentstack</h3>
            <ol style={{ margin: 0, paddingLeft: '20px', color: '#495057' }}>
              <li>Install this app in your Contentstack organization</li>
              <li>Add it as a Custom Field or Sidebar Widget to a content type</li>
              <li>Create or edit an entry with that content type</li>
              <li>The app will render with full SDK functionality</li>
            </ol>
          </div>
        </div>
      );
    }

    if (loading) {
      return <div style={{ padding: 16, textAlign: 'center' }}>Initializing...</div>;
    }

    if (!sdk) {
      return <div style={{ padding: 16, textAlign: 'center' }}>SDK not available</div>;
    }

    // Check if we're in a config screen context
    if (typeof window !== 'undefined' && window.location.pathname.endsWith('config-screen.html')) {
      return <ConfigScreen />;
    }

    // Check SDK location for different contexts
    switch (sdkLocation) {
      case 'SidebarWidget':
        return <SidebarWidget />;
      
      case 'CustomField':
        return <FlagVariationField />;
      
      case 'AppConfigWidget':
        return <ConfigScreen />;
      
      default:
        // Fallback: try to determine context from available properties
        if (sdk.location?.CustomField) {
          return <FlagVariationField />;
        }
        
        if (sdk.location?.SidebarWidget) {
          return <SidebarWidget />;
        }
        
        if (sdk.entry) {
          // If we have entry access, assume sidebar widget context
          return <SidebarWidget />;
        }
        
        // Default fallback
        return (
          <div style={{ padding: 16, textAlign: 'center' }}>
            <div style={{ color: '#b00020', marginBottom: 12 }}>Unknown App Context</div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 16 }}>
              This app is designed to work as a Custom Field or Sidebar Widget in Contentstack.
            </div>
            <div style={{ fontSize: 11, color: '#999', backgroundColor: '#f8f9fa', padding: 8, borderRadius: 4 }}>
              <strong>SDK Location:</strong> {sdkLocation || 'Unknown'}
            </div>
            <div style={{ fontSize: 11, color: '#999', marginTop: 8 }}>
              Available locations: {Object.keys(sdk.location || {}).join(', ')}
            </div>
          </div>
        );
    }
  };

  return renderComponent();
};

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 