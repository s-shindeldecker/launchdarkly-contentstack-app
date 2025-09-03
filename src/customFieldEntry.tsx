import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import ContentstackAppSdk from '@contentstack/app-sdk';
import FlagVariationField from './FlagVariationField';
import './styles.css';

// Add immediate logging to see if the script loads
console.log('🚀 [CustomField] Script loaded - customFieldEntry.tsx starting...');

// Add global error handler to catch any JavaScript errors
window.addEventListener('error', (event) => {
  console.error('❌ [CustomField] Global error caught:', event.error);
  console.error('❌ [CustomField] Error details:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ [CustomField] Unhandled promise rejection:', event.reason);
});

const CustomFieldApp: React.FC = () => {
  const [sdk, setSdk] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  console.log('🚀 [CustomField] CustomFieldApp component created');

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 [CustomField] Initializing custom field app...');
        
        // Initialize the Contentstack App SDK
        const sdkInstance = await ContentstackAppSdk.init();
        setSdk(sdkInstance);
        
        console.log('✅ [CustomField] SDK initialized successfully');
        console.log('🔍 [CustomField] SDK location keys:', sdkInstance.location ? Object.keys(sdkInstance.location) : 'No location');
        
        // Verify we're in the correct context
        if (sdkInstance.location?.CustomField) {
          console.log('✅ [CustomField] CustomField context detected');
          console.log('🔍 [CustomField] CustomField keys:', Object.keys(sdkInstance.location.CustomField));
          
          if (sdkInstance.location.CustomField.field) {
            console.log('✅ [CustomField] Field object available');
            console.log('🔍 [CustomField] Field methods:', Object.getOwnPropertyNames(sdkInstance.location.CustomField.field));
          } else {
            console.log('❌ [CustomField] Field object not available');
          }
        } else {
          console.log('❌ [CustomField] CustomField context not detected');
          console.log('🔍 [CustomField] Available locations:', sdkInstance.location ? Object.keys(sdkInstance.location) : 'None');
        }
        
        // Note: Removed post-robot event listener to prevent conflicts with config screen
        
        setLoading(false);
      } catch (error) {
        console.error('❌ [CustomField] Failed to initialize SDK:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 16, textAlign: 'center' }}>
        <div>Loading LaunchDarkly Custom Field...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 16, textAlign: 'center' }}>
        <div style={{ color: '#b00020', marginBottom: 12 }}>Error: {error}</div>
        <button 
          onClick={() => window.location.reload()} 
          style={{ 
            padding: '8px 12px', 
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
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

  // Always render the FlagVariationField component
  return <FlagVariationField />;
};

console.log('🚀 [CustomField] About to create React root...');
const rootElement = document.getElementById('root');
console.log('🚀 [CustomField] Root element found:', !!rootElement);

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  console.log('🚀 [CustomField] React root created, rendering app...');
  root.render(<CustomFieldApp />);
  console.log('🚀 [CustomField] App rendered successfully');
} else {
  console.error('❌ [CustomField] Root element not found!');
}
