import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initDiscord } from './lib/discord';
import App from './App';
import './index.css';

// Initialize Discord SDK first (no-ops if not in a Discord Activity).
// Always render the app even if Discord init fails.
initDiscord()
  .catch((err) => console.error('Discord init error (non-fatal):', err))
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  });
