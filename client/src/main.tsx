import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initDiscord } from './lib/discord';
import App from './App';
import './index.css';

// Initialize Discord SDK first (no-ops if not in a Discord Activity)
initDiscord().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});
