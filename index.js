// index.js
require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const mongoose = require('mongoose');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

// Create a new Discord client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages,  GatewayIntentBits.MessageContent] });

// Command collection
client.commands = new Collection();

// Read command files
const commandFiles = fs
  .readdirSync(path.join(__dirname, 'commands'))
  .filter(file => file.endsWith('.js'));

// Register commands
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
  console.log(`Loaded command: ${command.data.name}`);
}

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch(error => {
    console.error('MongoDB connection error:', error);
  });


mongoose.connection.once('open', () => {
  console.log('Connected to MongoDB');
});

// Event listener when the bot is ready
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  // Schedule a task to fetch updates every 5 minutes
  cron.schedule('*/5 * * * *', () => {
    const statsCommand = client.commands.get('stats');
    statsCommand.execute(null, null, client);
  });
});

// Message listener
client.on('messageCreate', async message => {
  console.log(`Received message: ${message.content} from ${message.author.tag} in ${message.channel.name}`);

  if (!message.content.startsWith('!') || message.author.bot) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  console.log(`Command received: ${commandName} with arguments: ${args}`);

  const command = client.commands.get(commandName);

  if (!command) {
    console.log(`No command found for ${commandName}`);
    return;
  }

  try {
    await command.execute(message, args, client);
    console.log(`Executed command: ${commandName}`);
  } catch (error) {
    console.error(`Error executing command ${commandName}:`, error);
    message.reply('There was an error executing that command.');
  }
});


// Login to Discord
client.login(process.env.DISCORD_TOKEN);
