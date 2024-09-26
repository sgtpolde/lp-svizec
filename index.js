// index.js

const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const mongoose = require('mongoose');
const logger = require('./utils/logger');
require('./utils/keepAlive.js'); 

// Load environment variables from .env file
require('dotenv').config();

// Check for required environment variables
if (!process.env.DISCORD_TOKEN) {
  logger.error('Missing DISCORD_TOKEN in environment variables.');
  process.exit(1);
}

if (!process.env.MONGODB_URI) {
  logger.error('Missing MONGODB_URI in environment variables.');
  process.exit(1);
}

// Create a new Discord client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Command collection
client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  try {
    const command = require(filePath);
    if (!command.data || !command.data.name) {
      logger.warn(`The command at ${file} is missing a required "data.name" property.`);
      continue;
    }
    client.commands.set(command.data.name, command);
    logger.info(`Loaded command: ${command.data.name}`);
  } catch (error) {
    logger.error(`Error loading command ${file}: ${error.message}`);
  }
}

// Load events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs
  .readdirSync(eventsPath)
  .filter((file) => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  try {
    const event = require(filePath);
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
    logger.info(`Loaded event: ${event.name}`);
  } catch (error) {
    logger.error(`Error loading event ${file}: ${error.message}`);
  }
}

// Initialize the bot
(async () => {
  try {
    await initializeBot();
  } catch (error) {
    logger.error(`Failed to initialize bot: ${error.message}`);
    process.exit(1);
  }
})();

async function initializeBot() {
  await mongoose.connect(process.env.MONGODB_URI);
  logger.info('Connected to MongoDB');

  // Login to Discord
  await client.login(process.env.DISCORD_TOKEN);
  logger.info('Logged in to Discord');
}

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT. Shutting down gracefully.');
  shutdown();
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM. Shutting down gracefully.');
  shutdown();
});

async function shutdown() {
  try {
    await client.destroy();
    await mongoose.disconnect();
    logger.info('Bot and MongoDB connection closed.');
    process.exit(0);
  } catch (error) {
    logger.error(`Error during shutdown: ${error.stack || error.message}`);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  logger.error(`Unhandled promise rejection: ${error.stack || error.message}`);
});

// Handle client errors
client.on('error', (error) => {
  logger.error(`Client error: ${error.stack || error.message}`);
});

// Rate limit handling
client.on('rateLimit', (info) => {
  logger.warn(`Rate limit hit: ${JSON.stringify(info)}`);
});
