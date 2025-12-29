// index.js
import 'dotenv/config';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import mongoose from 'mongoose';
import logger from './utils/logger.js';

// __dirname replacement for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// #1  Configuration & early validation
// ---------------------------------------------------------------------------
const { DISCORD_TOKEN, MONGODB_URI } = process.env;
if (!DISCORD_TOKEN || !MONGODB_URI) {
  logger.error('Missing required env vars: DISCORD_TOKEN and / or MONGODB_URI.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// #2  Discord client
// ---------------------------------------------------------------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});
client.commands = new Collection();

// ---------------------------------------------------------------------------
// #3  Dynamic loaders (ESM version)
// ---------------------------------------------------------------------------
const JS_EXT = /\.js$/;

async function loadDir(dir, onLoad) {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) return 0;

  const files = fs.readdirSync(dirPath).filter(f => JS_EXT.test(f));
  let count = 0;

  for (const file of files) {
    try {
      const filePath = path.join(dirPath, file);
      // Convert Windows backslashes to forward slashes for URL
      const fileUrl = `file:///${filePath.replace(/\\/g, '/')}`;
      const module = await import(fileUrl);
      onLoad(module.default);
      count++;
    } catch (err) {
      logger.error(`Failed loading ${dir}/${file}: ${err.message}`);
    }
  }

  return count;
}

async function loadCommands() {
  return loadDir('commands', command => {
    if (!command?.data?.name) {
      logger.warn('Command missing "data.name" – skipped');
      return;
    }
    client.commands.set(command.data.name, command);
    logger.debug(`Loaded command: ${command.data.name}`);
  });
}

async function loadEvents() {
  return loadDir('events', event => {
    const handler = (...args) => event.execute(...args, client);
    event.once ? client.once(event.name, handler) : client.on(event.name, handler);
    logger.debug(`Loaded event: ${event.name}`);
  });
}

// ---------------------------------------------------------------------------
// #4  Start-up (top-level await)
// ---------------------------------------------------------------------------
try {
  const commandsLoaded = await loadCommands();
  const eventsLoaded = await loadEvents();
  logger.info(`Commands loaded: ${commandsLoaded} | Events loaded: ${eventsLoaded}`);

  await mongoose.connect(MONGODB_URI);
  logger.info('✅ Connected to MongoDB');

  await client.login(DISCORD_TOKEN);
  logger.info(`✅ Logged in as ${client.user.tag}`);
} catch (err) {
  logger.error(`Startup failed: ${err.stack || err}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// #5  Process-level robustness
// ---------------------------------------------------------------------------
process.on('unhandledRejection', err => logger.error(`Unhandled rejection: ${err.stack || err}`));

client
  .on('error', err => logger.error(`Client error: ${err.stack || err}`))
  .on('rateLimit', info => logger.warn(`Rate-limit hit: ${JSON.stringify(info)}`));

// ---------------------------------------------------------------------------
// #6  Graceful shutdown
// ---------------------------------------------------------------------------
async function shutdown(signal) {
  logger.info(`${signal} received – shutting down…`);
  try {
    await client.destroy();
    await mongoose.disconnect();
    logger.info('Cleanup finished – bye!');
    process.exit(0);
  } catch (err) {
    logger.error(`Shutdown error: ${err.stack || err}`);
    process.exit(1);
  }
}

['SIGINT', 'SIGTERM'].forEach(sig => process.on(sig, () => shutdown(sig)));
