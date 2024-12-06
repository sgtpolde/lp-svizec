// index.js

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const mongoose = require('mongoose');
const logger = require('./utils/logger');

// Validate required environment variables
checkEnvVars(['DISCORD_TOKEN', 'MONGODB_URI']);

// Create a new Discord client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Extend the Discord client with a commands Collection
client.commands = new Collection();

// Load commands and events
loadCommands(client);
loadEvents(client);

// Initialize the bot
(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Connected to MongoDB');

    await client.login(process.env.DISCORD_TOKEN);
    logger.info('Logged in to Discord');
  } catch (error) {
    logger.error(`Failed to initialize bot: ${error.message}`);
    process.exit(1);
  }
})();

// Graceful shutdown handlers
process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);

// Handle uncaught promise rejections
process.on('unhandledRejection', (error) => {
  logger.error(`Unhandled promise rejection: ${error.stack || error}`);
});

// Handle client errors
client.on('error', (error) => {
  logger.error(`Client error: ${error.stack || error}`);
});

// Handle rate limit events
client.on('rateLimit', (info) => {
  logger.warn(`Rate limit hit: ${JSON.stringify(info)}`);
});

/**
 * Check for required environment variables.
 * @param {string[]} vars - The required environment variables.
 */
function checkEnvVars(vars) {
  for (const variable of vars) {
    if (!process.env[variable]) {
      logger.error(`Missing ${variable} in environment variables.`);
      process.exit(1);
    }
  }
}

/**
 * Load all commands from the "commands" directory.
 * @param {Client} client - The Discord client.
 */
function loadCommands(client) {
  const commandsPath = path.join(__dirname, 'commands');
  if (!fs.existsSync(commandsPath)) return;

  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
      const command = require(filePath);
      if (!command.data || !command.data.name) {
        logger.warn(`Command file "${file}" missing required "data.name".`);
        continue;
      }
      client.commands.set(command.data.name, command);
      logger.info(`Loaded command: ${command.data.name}`);
    } catch (error) {
      logger.error(`Error loading command "${file}": ${error.message}`);
    }
  }
}

/**
 * Load all events from the "events" directory.
 * @param {Client} client - The Discord client.
 */
function loadEvents(client) {
  const eventsPath = path.join(__dirname, 'events');
  if (!fs.existsSync(eventsPath)) return;

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
      logger.error(`Error loading event "${file}": ${error.message}`);
    }
  }
}

/**
 * Handle graceful shutdown of the application.
 */
async function handleShutdown() {
  logger.info('Shutting down gracefully...');

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
