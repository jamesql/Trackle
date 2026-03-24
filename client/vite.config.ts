import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
    // Allow Discord's proxy domain to connect during dev
    allowedHosts: ['.discordsays.com', '.discord.com'],
    // Configure HMR for Discord iframe (needs specific host/port)
    hmr: {
      clientPort: 443,
    },
  },
});
