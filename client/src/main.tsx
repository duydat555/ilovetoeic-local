import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { applyDisplaySettings, getStoredDisplaySettings } from './services/displaySettings';

// Initialize and enforce user display & typography settings prior to rendering
applyDisplaySettings(getStoredDisplaySettings());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
