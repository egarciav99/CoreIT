import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {lazy, Suspense} from 'react';
import {isHosted, loadConfig} from './config';
import './index.css';

loadConfig().then((config) => {
  document.title = config.companyName ? `CoreIT · ${config.companyName}` : 'CoreIT Automatización';
  // Con Supabase configurado: login, empresas y roles. Sin él: hub local (demo o una sola persona).
  const Root = isHosted() ? lazy(() => import('./hosted/HostedApp')) : lazy(() => import('./App.tsx'));
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Suspense fallback={null}>
        <Root />
      </Suspense>
    </StrictMode>,
  );
});
