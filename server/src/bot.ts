/**
 * Discord bot for Trackle slash commands and daily review.
 * Commands: /trackle play, /trackle daily, /trackle review
 * Also schedules a daily review post showing all participants' results.
 */
import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  type Interaction,
  type TextChannel,
} from 'discord.js';
import { PrismaClient, type DiscordDailyResult } from '@prisma/client';
import { config } from './config.js';
import { getTrack } from './services/spotify.js';

const prisma = new PrismaClient();

// ─── Slash Command Definitions ───────────────────────────────────────────────

const COMMANDS = [
  new SlashCommandBuilder()
    .setName('trackle')
    .setDescription('Play Trackle — guess the song!')
    .addSubcommand((sub) =>
      sub.setName('play').setDescription('Launch Trackle in this channel')
    )
    .addSubcommand((sub) =>
      sub.setName('daily').setDescription("Share today's daily challenge result")
    )
    .addSubcommand((sub) =>
      sub
        .setName('review')
        .setDescription('Set this channel for the daily results review')
    ),
];

async function registerCommands() {
  if (!config.DISCORD_CLIENT_ID || !config.DISCORD_BOT_TOKEN) return;

  const rest = new REST({ version: '10' }).setToken(config.DISCORD_BOT_TOKEN);

  try {
    const existing = (await rest.get(
      Routes.applicationCommands(config.DISCORD_CLIENT_ID)
    )) as Array<{ id: string; name: string; type?: number }>;

    // Keep any Entry Point commands (type 4)
    const preserved = existing.filter((cmd) => cmd.type === 4);
    const newCommands = [...preserved, ...COMMANDS.map((c) => c.toJSON())];

    await rest.put(
      Routes.applicationCommands(config.DISCORD_CLIENT_ID),
      { body: newCommands }
    );
    console.log('Discord slash commands registered');
  } catch (err) {
    console.error('Failed to register slash commands:', err);
  }
}

// ─── Embeds & Buttons ────────────────────────────────────────────────────────

function createPlayEmbed() {
  return new EmbedBuilder()
    .setColor(0x1db954)
    .setTitle('🎧 Trackle')
    .setDescription(
      'Listen to a song clip and guess the track!\n\n' +
      '🎵 **6 attempts** — clips get longer each round\n' +
      '⏱️ 1s → 2s → 4s → 7s → 11s → 16s\n\n' +
      'Launch the activity to play right here in Discord!'
    )
    .setFooter({ text: 'Trackle — Guess the track' });
}

function createPlayButton() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel('Play Trackle')
      .setStyle(ButtonStyle.Link)
      .setURL(`https://discord.com/activities/${config.DISCORD_CLIENT_ID}`)
      .setEmoji('🎵'),
  );
}

function buildResultEmbed(username: string, score: string, guessGrid: string, date: string) {
  const won = !score.startsWith('X');
  return new EmbedBuilder()
    .setColor(won ? 0x1db954 : 0xe74c3c)
    .setTitle(`🎧 Trackle Daily — ${date}`)
    .setDescription(
      `**${username}** scored **${score}**\n\n${guessGrid}`
    )
    .setFooter({ text: 'Trackle — Guess the track' });
}

// ─── Interaction Handler ─────────────────────────────────────────────────────

async function handleInteraction(interaction: Interaction) {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'trackle') return;

  const sub = interaction.options.getSubcommand();

  if (sub === 'play') {
    await interaction.reply({
      embeds: [createPlayEmbed()],
      components: [createPlayButton()],
    });
    return;
  }

  if (sub === 'daily') {
    await handleDaily(interaction);
    return;
  }

  if (sub === 'review') {
    await handleReview(interaction);
    return;
  }
}

async function handleDaily(interaction: Interaction & { reply: Function; user: { id: string }; guildId: string | null }) {
  const today = new Date().toISOString().slice(0, 10);
  const discordId = interaction.user.id;
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    return;
  }

  // Look up the user's result for today in this guild
  const result = await prisma.discordDailyResult.findFirst({
    where: { discordId, date: today, guildId },
  });

  if (!result) {
    // No result — prompt them to play
    const embed = new EmbedBuilder()
      .setColor(0x1db954)
      .setTitle(`🎧 Trackle Daily — ${today}`)
      .setDescription("You haven't played today's daily challenge yet!\nLaunch the activity to play:")
      .setFooter({ text: 'Trackle — Guess the track' });

    await interaction.reply({
      embeds: [embed],
      components: [createPlayButton()],
    });
    return;
  }

  // Show their actual result
  const embed = buildResultEmbed(
    result.username,
    result.score,
    result.guessGrid,
    today,
  );

  await interaction.reply({
    embeds: [embed],
    components: [createPlayButton()],
  });
}

async function handleReview(interaction: Interaction & { reply: Function; memberPermissions: any; guildId: string | null; channelId: string }) {
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    return;
  }

  // Require Manage Server permission to configure the review channel
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({
      content: 'You need the **Manage Server** permission to set the review channel.',
      ephemeral: true,
    });
    return;
  }

  await prisma.discordReviewChannel.upsert({
    where: { guildId },
    update: { channelId: interaction.channelId },
    create: { guildId, channelId: interaction.channelId },
  });

  await interaction.reply({
    content: `Daily review will be posted in this channel! Each day when the new daily challenge starts, yesterday's results will be shown here.`,
    ephemeral: true,
  });
}

// ─── Daily Review Scheduler ──────────────────────────────────────────────────

let botClient: Client | null = null;
let lastReviewDate: string | null = null;

/** Post yesterday's daily review to all configured guild channels. */
async function postDailyReview() {
  if (!botClient) return;

  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  // Don't double-post for the same date
  if (lastReviewDate === yesterday) return;

  const channels = await prisma.discordReviewChannel.findMany();
  if (channels.length === 0) return;

  // Get yesterday's results grouped by guild
  const allResults = await prisma.discordDailyResult.findMany({
    where: { date: yesterday },
    orderBy: { attempts: 'asc' },
  });

  if (allResults.length === 0) return;

  // Get yesterday's song info
  const dailySong = await prisma.dailySong.findUnique({ where: { date: yesterday } });
  let songLine = '';
  if (dailySong) {
    const track = await getTrack(dailySong.trackId).catch(() => null);
    if (track) {
      songLine = `\n🎵 **${track.title}** by ${track.artist}`;
    }
  }

  // Group results by guild
  const byGuild = new Map<string, DiscordDailyResult[]>();
  for (const r of allResults) {
    const list = byGuild.get(r.guildId) ?? [];
    list.push(r);
    byGuild.set(r.guildId, list);
  }

  for (const channelConfig of channels) {
    const guildResults = byGuild.get(channelConfig.guildId);
    if (!guildResults || guildResults.length === 0) continue;

    try {
      const channel = await botClient.channels.fetch(channelConfig.channelId) as TextChannel | null;
      if (!channel || !('send' in channel)) continue;

      const winners = guildResults.filter((r) => r.won);
      const totalAttempts = winners.reduce((sum, r) => sum + r.attempts, 0);
      const avgScore = winners.length > 0
        ? (totalAttempts / winners.length).toFixed(1)
        : '-';

      // Build the results list
      const lines = guildResults.map((r) => {
        return `**${r.username}**  ${r.score}  ${r.guessGrid}`;
      });

      const statsLine = `${guildResults.length} player${guildResults.length !== 1 ? 's' : ''} · ${winners.length} winner${winners.length !== 1 ? 's' : ''}${winners.length > 0 ? ` · Avg: ${avgScore}/6` : ''}`;

      const embed = new EmbedBuilder()
        .setColor(0x1db954)
        .setTitle(`📊 Trackle Daily Review — ${yesterday}`)
        .setDescription(
          lines.join('\n') +
          '\n' +
          songLine +
          '\n\n' +
          statsLine
        )
        .setFooter({ text: 'Trackle — Guess the track' });

      await channel.send({ embeds: [embed] });
    } catch (err) {
      console.error(`Failed to post review to channel ${channelConfig.channelId}:`, err);
    }
  }

  lastReviewDate = yesterday;
  console.log(`Daily review posted for ${yesterday}`);
}

/** Check every 30 minutes if we need to post a review (on day change). */
function startReviewScheduler() {
  // Check immediately on startup in case the server restarted after midnight
  setTimeout(() => postDailyReview().catch(console.error), 5_000);

  // Then check every 30 minutes
  setInterval(() => {
    postDailyReview().catch(console.error);
  }, 30 * 60 * 1000);
}

// ─── Bot Startup ─────────────────────────────────────────────────────────────

export async function startBot() {
  if (!config.DISCORD_BOT_TOKEN) {
    console.log('DISCORD_BOT_TOKEN not set — bot disabled');
    return;
  }

  await registerCommands();

  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  client.on('interactionCreate', handleInteraction);

  client.on('ready', () => {
    console.log(`Discord bot logged in as ${client.user?.tag}`);
    botClient = client;
    startReviewScheduler();
  });

  await client.login(config.DISCORD_BOT_TOKEN);
}
