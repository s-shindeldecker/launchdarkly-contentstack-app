import React from 'react';
import ReactDOM from 'react-dom/client';
import SimpleFlagField from './SimpleFlagField';
import './styles.css';

console.log('🚀 [CustomField] Loading simplified custom field...');

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<SimpleFlagField />);

console.log('✅ [CustomField] Simplified custom field rendered');
