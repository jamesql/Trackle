/**
 * Discord bot for Trackle slash commands.
 * Registers and handles /trackle play and /trackle daily commands.
 * Runs alongside the Express server (not a separate process).
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
  type Interaction,
} from 'discord.js';
import { config } from './config.js';

const COMMANDS = [
  new SlashCommandBuilder()
    .setName('trackle')
    .setDescription('Play Trackle — guess the song!')
    .addSubcommand((sub) =>
      sub.setName('play').setDescription('Launch Trackle in this channel')
    )
    .addSubcommand((sub) =>
      sub.setName('daily').setDescription("Share today's daily challenge result")
    ),
];

async function registerCommands() {
  if (!config.DISCORD_CLIENT_ID || !config.DISCORD_BOT_TOKEN) return;

  const rest = new REST({ version: '10' }).setToken(config.DISCORD_BOT_TOKEN);

  try {
    // Fetch existing commands to preserve the Entry Point command
    const existing = (await rest.get(
      Routes.applicationCommands(config.DISCORD_CLIENT_ID)
    )) as Array<{ id: string; name: string; type?: number }>;

    // Keep any Entry Point commands (type 4) and system commands
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

function createPlayEmbed() {
  return new EmbedBuilder()
    .setColor(0x1db954)
    .setTitle('🎧 Trackle')
    .setDescription('Listen to a song clip and guess the track!\n\n**6 attempts** • Clips get longer each round')
    .setFooter({ text: 'Trackle — Guess the track' });
}

function createPlayButton() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel('Play Trackle')
      .setStyle(ButtonStyle.Link)
      .setURL(`https://${config.DISCORD_CLIENT_ID}.discordsays.com`)
      .setEmoji('🎵'),
  );
}

function handleInteraction(interaction: Interaction) {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'trackle') return;

  const sub = interaction.options.getSubcommand();

  if (sub === 'play') {
    interaction.reply({
      embeds: [createPlayEmbed()],
      components: [createPlayButton()],
    });
  } else if (sub === 'daily') {
    const today = new Date().toISOString().slice(0, 10);
    const embed = new EmbedBuilder()
      .setColor(0x1db954)
      .setTitle(`🎧 Trackle Daily — ${today}`)
      .setDescription('Play today\'s daily challenge and share your results!')
      .setFooter({ text: 'Trackle — Guess the track' });

    interaction.reply({
      embeds: [embed],
      components: [createPlayButton()],
    });
  }
}

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
  });

  await client.login(config.DISCORD_BOT_TOKEN);
}
