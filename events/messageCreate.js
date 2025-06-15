// events/messageCreate.js

const { Collection } = require('discord.js');
const logger = require('../utils/logger').child({ label: 'events/messageCreate' });

const COMMAND_PREFIX = process.env.COMMAND_PREFIX || '!';
const DEFAULT_COOLDOWN_SEC = 3;
const cooldowns = new Collection(); // commandName → userId → timestamp

module.exports = {
  name: 'messageCreate',
  /**
   * @param {import('discord.js').Message} message
   * @param {import('discord.js').Client}  client
   */
  async execute(message, client) {
    // -- Ignore bot & prefixless messages
    if (message.author.bot || !message.content.startsWith(COMMAND_PREFIX)) return;

    // -- Parse command + args (quoted strings allowed)
    const withoutPrefix = message.content.slice(COMMAND_PREFIX.length).trim();
    const [commandName, ...args] = tokenize(withoutPrefix);
    if (!commandName) return;

    const command = client.commands.get(commandName.toLowerCase());
    if (!command) {
      logger.warn(`Unknown command "${commandName}" from ${message.author.tag}`);
      await message.reply(
        `I don't recognize the command \`${commandName}\`. Try \`${COMMAND_PREFIX}help\` for a list of commands.`
      );
      return;
    }

    // -- Cooldown check
    const now = Date.now();
    const userTimestamps = cooldowns.ensure(command.data.name, () => new Collection());
    const cooldownMs = (command.cooldown ?? DEFAULT_COOLDOWN_SEC) * 1000;

    const expiration = userTimestamps.get(message.author.id);
    if (expiration && now < expiration) {
      const timeLeft = ((expiration - now) / 1000).toFixed(1);
      await message.reply(
        `Please wait ${timeLeft}s before reusing the \`${command.data.name}\` command.`
      );
      return;
    }
    userTimestamps.set(message.author.id, now + cooldownMs);

    try {
      logger.time(command.data.name); // start timer
      await command.execute(message, args, client);
      logger.timeEnd(command.data.name, `Ran by ${message.author.tag}`);
    } catch (err) {
      logger.error(`Command "${command.data.name}" failed – ${err.stack || err}`);
      await message.reply('❌  An unexpected error occurred while executing that command.');
    }
  },
};

// ----------------------------------------------------
// helper – split string by spaces but keep quoted substrings intact
// e.g.  \"Add My Name\" 1234 euw  → ["Add My Name", "1234", "euw"]
// ----------------------------------------------------
function tokenize(input) {
  const tokens = [];
  const regex = /"([^"]+)"|'([^']+)'|(\S+)/g;
  let match;
  while ((match = regex.exec(input)) !== null) {
    tokens.push(match[1] || match[2] || match[3]);
  }
  return tokens;
}

// tiny util on Collection prototype
Collection.prototype.ensure = function (key, factory) {
  if (this.has(key)) return this.get(key);
  const val = factory(key, this);
  this.set(key, val);
  return val;
};
