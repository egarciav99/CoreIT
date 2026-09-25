import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {loadConfig} from './config';
import './index.css';

loadConfig().then((config) => {
  document.title = config.companyName ? `CoreIT · ${config.companyName}` : 'CoreIT Automatización';
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
