/** Validated environment variables. Throws at startup if required vars are missing. */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  SPOTIFY_CLIENT_ID: requireEnv('SPOTIFY_CLIENT_ID'),
  SPOTIFY_CLIENT_SECRET: requireEnv('SPOTIFY_CLIENT_SECRET'),
  DAILY_SONG_SEED_SECRET: requireEnv('DAILY_SONG_SEED_SECRET'),
  PORT: parseInt(process.env.PORT || '3001', 10),
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
};
