import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { AppErrorBoundary } from './components/common/AppErrorBoundary';
import { BoneyardSkeleton } from './components/common/BoneyardSkeleton';
import './index.css';
import { applyDisplaySettings, getStoredDisplaySettings } from './services/displaySettings';

// Initialize and enforce user display & typography settings prior to rendering
applyDisplaySettings(getStoredDisplaySettings());
const App = lazy(() => import('./App'));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <Suspense fallback={<div role="status" aria-label="Đang mở ứng dụng" className="grid min-h-[100dvh] place-items-center"><BoneyardSkeleton name="app-startup" height={64} width={260} /></div>}>
        <App />
      </Suspense>
    </AppErrorBoundary>
  </React.StrictMode>
);
