/** Global Express error handler. Catches unhandled errors and returns consistent JSON. */
import type { ErrorRequestHandler } from 'express';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(`[${new Date().toISOString()}] Unhandled error:`, err);

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({ error: message });
};
