/**
 * Express server entry point.
 * In production, serves both HTTPS (with Cloudflare Origin cert) and the built React frontend.
 * Supports Discord Activity iframe embedding via permissive CSP.
 */
import 'dotenv/config';
import fs from 'node:fs';
import https from 'node:https';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import apiRouter from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimit } from './middleware/rateLimit.js';

const app = express();

// CORS — allow both the frontend URL and Discord's proxy domain
app.use(cors({
  origin: [
    config.FRONTEND_URL,
    /\.discordsays\.com$/,
    /\.discord\.com$/,
  ],
}));

app.use(express.json());

// Allow iframe embedding by Discord (remove X-Frame-Options, set permissive CSP)
app.use((_req, res, next) => {
  res.removeHeader('X-Frame-Options');
  res.setHeader(
    'Content-Security-Policy',
    "frame-ancestors 'self' https://discord.com https://*.discord.com https://*.discordsays.com"
  );
  next();
});

// Rate limiting: 60 requests per minute per IP
app.use('/api', rateLimit(60, 60_000));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', apiRouter);

// In production, serve the built React frontend
if (process.env.NODE_ENV === 'production') {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  // SPA fallback — serve index.html for all non-API routes
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use(errorHandler);

// Try HTTPS with Cloudflare Origin cert, fall back to HTTP
const SSL_CERT = process.env.SSL_CERT_PATH || '/etc/ssl/cloudflare/origin.pem';
const SSL_KEY = process.env.SSL_KEY_PATH || '/etc/ssl/cloudflare/origin-key.pem';

if (fs.existsSync(SSL_CERT) && fs.existsSync(SSL_KEY)) {
  const sslOptions = {
    cert: fs.readFileSync(SSL_CERT),
    key: fs.readFileSync(SSL_KEY),
  };

  // HTTPS on 443 (for Discord proxy + Cloudflare Full mode)
  https.createServer(sslOptions, app).listen(443, () => {
    console.log('HTTPS server running on port 443');
  });

  // HTTP on 80 (redirect to HTTPS)
  http.createServer((req, res) => {
    res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` });
    res.end();
  }).listen(80, () => {
    console.log('HTTP redirect running on port 80');
  });
} else {
  // No SSL certs found — plain HTTP (dev mode)
  app.listen(config.PORT, () => {
    console.log(`Server running on port ${config.PORT}`);
  });
}
