import React from 'react';
import ReactDOM from 'react-dom/client';
import FlagVariationField from './FlagVariationField';
import ConfigScreen from './ConfigScreen';
import './styles.css';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

const isConfig = typeof window !== 'undefined' && window.location.pathname.endsWith('config-screen.html');

root.render(
  <React.StrictMode>
    {isConfig ? <ConfigScreen /> : <FlagVariationField />}
  </React.StrictMode>
); 