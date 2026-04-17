require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');
const { loadStaticConfig } = require('./config');
const { createDb, initDb, getSetting, upsertSetting } = require('./db');
const { onGuildMemberAdd } = require('./events/guildMemberAdd');
const { handleAdminCommands } = require('./commands/admin');

const token = process.env.DISCORD_BOT_TOKEN;
const commandPrefix = process.env.COMMAND_PREFIX || '!';
const welcomeChannelName = process.env.WELCOME_CHANNEL_NAME || 'welcome';
const logChannelName = process.env.LOG_CHANNEL_NAME || 'join-logs';

if (!token) {
  throw new Error('DISCORD_BOT_TOKEN is required. Set it in your environment or .env file.');
}

const dataDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const logger = {
  info: (msg) => console.log(`[INFO] ${new Date().toISOString()} ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${new Date().toISOString()} ${msg}`),
  error: (msg) => console.error(`[ERROR] ${new Date().toISOString()} ${msg}`)
};

const staticConfig = loadStaticConfig();
const db = createDb();

const dbApi = {
  async bootstrap() {
    await initDb(db);

    const existingRole = await getSetting(db, 'autoRoleName');
    const existingWelcome = await getSetting(db, 'welcomeMessage');

    if (!existingRole) {
      await upsertSetting(db, 'autoRoleName', staticConfig.autoRoleName);
    }

    if (!existingWelcome) {
      await upsertSetting(db, 'welcomeMessage', staticConfig.welcomeMessage);
    }
  },
  async getAutoRoleName() {
    return (await getSetting(db, 'autoRoleName')) || staticConfig.autoRoleName;
  },
  async setAutoRoleName(value) {
    await upsertSetting(db, 'autoRoleName', value);
  },
  async getWelcomeMessage() {
    return (await getSetting(db, 'welcomeMessage')) || staticConfig.welcomeMessage;
  },
  async setWelcomeMessage(value) {
    await upsertSetting(db, 'welcomeMessage', value);
  }
};

async function start() {
  await dbApi.bootstrap();

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ]
  });

  client.once('ready', () => {
    logger.info(`Bot logged in as ${client.user.tag}`);
  });

  client.on('guildMemberAdd', async (member) => {
    try {
      await onGuildMemberAdd(member, {
        dbApi,
        logger,
        welcomeChannelName,
        logChannelName
      });
    } catch (error) {
      logger.error(`[JOIN] Unexpected error for ${member.user.tag}: ${error.message}`);
    }
  });

  client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) {
      return;
    }

    try {
      await handleAdminCommands(message, {
        prefix: commandPrefix,
        adminRoleName: staticConfig.adminRoleName,
        dbApi
      });
    } catch (error) {
      logger.error(`[COMMAND] Error processing command: ${error.message}`);
      await message.reply('An unexpected error occurred while processing your command.');
    }
  });

  await client.login(token);
}

start().catch((error) => {
  logger.error(`Fatal startup error: ${error.message}`);
  process.exit(1);
});
