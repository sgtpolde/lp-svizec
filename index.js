// index.js
require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const mongoose = require('mongoose');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger');

// Create a new Discord client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, // For guild-related events
    GatewayIntentBits.GuildMessages, // For message events in guilds
    GatewayIntentBits.MessageContent, // To read the content of messages
  ],
});

// Command collection
client.commands = new Collection();

// Read command files
const commandFiles = fs
  .readdirSync(path.join(__dirname, 'commands'))
  .filter((file) => file.endsWith('.js'));

// Register commands
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
  logger.info(`Loaded command: ${command.data.name}`);
}

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    logger.info('Connected to MongoDB');
  })
  .catch((error) => {
    logger.error(`MongoDB connection error: ${error}`);
  });

// Event listener when the bot is ready
client.once('ready', () => {
  logger.info(`Logged in as ${client.user.tag}`);
  // Schedule a task to fetch updates every 5 minutes
  cron.schedule('*/5 * * * *', () => {
    const statsCommand = client.commands.get('stats');
    statsCommand.execute(null, null, client);
  });
});

// Message listener
client.on('messageCreate', async (message) => {
  logger.info(
    `Received message: ${message.content} from ${message.author.tag} in ${message.channel.name}`
  );

  if (!message.content.startsWith('!') || message.author.bot) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  logger.info(`Command received: ${commandName} with arguments: ${args}`);

  const command = client.commands.get(commandName);

  if (!command) {
    logger.warn(`No command found for ${commandName}`);
    return;
  }

  try {
    await command.execute(message, args, client);
    logger.info(`Executed command: ${commandName}`);
  } catch (error) {
    logger.error(`Error executing command ${commandName}: ${error}`);
    message.reply('There was an error executing that command.');
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  logger.error(`Unhandled promise rejection: ${error}`);
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);
