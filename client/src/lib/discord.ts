/**
 * Discord Embedded App SDK integration.
 * Initializes the SDK when running inside a Discord Activity iframe.
 * Falls back gracefully when running as a standalone web app.
 */
import { DiscordSDK } from '@discord/embedded-app-sdk';

let discordSdk: DiscordSDK | null = null;
let isDiscordActivity = false;

/** Check if the app is running inside a Discord Activity iframe. */
function detectDiscordActivity(): boolean {
  // Discord injects frame_id and instance_id into the URL
  const params = new URLSearchParams(window.location.search);
  return params.has('frame_id') && params.has('instance_id');
}

/**
 * Initialize the Discord SDK if running inside an Activity.
 * Must be called before rendering the React app.
 * Returns silently if not in Discord — the app works standalone too.
 */
export async function initDiscord(): Promise<void> {
  isDiscordActivity = detectDiscordActivity();

  if (!isDiscordActivity) return;

  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
  if (!clientId) {
    console.warn('VITE_DISCORD_CLIENT_ID not set — Discord Activity features disabled');
    isDiscordActivity = false;
    return;
  }

  try {
    discordSdk = new DiscordSDK(clientId);
    await discordSdk.ready();
    console.log('Discord SDK ready');
  } catch (err) {
    console.error('Discord SDK initialization failed:', err);
    isDiscordActivity = false;
    discordSdk = null;
  }
}

/** Returns true if currently running inside a Discord Activity. */
export function isInDiscord(): boolean {
  return isDiscordActivity;
}

/** Returns the Discord SDK instance (null if not in Discord). */
export function getDiscordSdk(): DiscordSDK | null {
  return discordSdk;
}
