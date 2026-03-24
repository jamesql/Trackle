/**
 * Discord Embedded App SDK integration.
 * Handles SDK init, user auth, activity status updates, and sharing.
 */
import { DiscordSDK } from '@discord/embedded-app-sdk';

let discordSdk: DiscordSDK | null = null;
let isDiscordActivity = false;
let discordUser: { id: string; username: string; avatar?: string | null; global_name?: string | null } | null = null;
let accessToken: string | null = null;

function detectDiscordActivity(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.has('frame_id') && params.has('instance_id');
}

export async function initDiscord(): Promise<void> {
  isDiscordActivity = detectDiscordActivity();
  if (!isDiscordActivity) return;

  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
  if (!clientId) {
    console.warn('VITE_DISCORD_CLIENT_ID not set');
    isDiscordActivity = false;
    return;
  }

  try {
    discordSdk = new DiscordSDK(clientId);
    await discordSdk.ready();
    console.log('Discord SDK ready');

    // Authenticate to get user info
    const { code } = await discordSdk.commands.authorize({
      client_id: clientId,
      response_type: 'code',
      state: '',
      prompt: 'none',
      scope: ['identify', 'rpc.activities.write'],
    });

    // Exchange code for token via our backend
    const res = await fetch('/api/discord/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    if (res.ok) {
      const data = await res.json() as { access_token: string };
      accessToken = data.access_token;

      const auth = await discordSdk.commands.authenticate({ access_token: accessToken });
      discordUser = auth.user;
      console.log('Discord user:', discordUser?.global_name || discordUser?.username);
    }
  } catch (err) {
    console.error('Discord init/auth error:', err);
    // Activity still works without auth — just no rich presence
  }
}

export function isInDiscord(): boolean {
  return isDiscordActivity;
}

export function getDiscordSdk(): DiscordSDK | null {
  return discordSdk;
}

export function getDiscordUser() {
  return discordUser;
}

/** Update the activity status shown in Discord (e.g. "Guess 3/6") */
export async function updateActivity(state: string, details?: string): Promise<void> {
  if (!discordSdk || !isDiscordActivity) return;
  try {
    await discordSdk.commands.setActivity({
      activity: {
        type: 0,
        state,
        details: details ?? 'Playing Trackle',
        assets: {
          large_text: 'Trackle — Guess the track',
        },
        timestamps: { start: Date.now() },
        instance: true,
      },
    });
  } catch (err) {
    console.warn('Failed to update activity:', err);
  }
}

/** Share results using Discord's native share dialog */
export async function shareResults(text: string): Promise<boolean> {
  if (!discordSdk || !isDiscordActivity) return false;
  try {
    await discordSdk.commands.shareLink({
      message: text,
    });
    return true;
  } catch (err) {
    console.warn('Failed to share:', err);
    return false;
  }
}
