// events/messageCreate.js
const { Collection } = require('discord.js');
const logger = require('../utils/logger');

// Cooldowns collection (if not declared globally)
const cooldowns = new Collection();

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot) return;

    const COMMAND_PREFIX = process.env.COMMAND_PREFIX || '!';

    if (!message.content.startsWith(COMMAND_PREFIX)) return;

    const args = message.content
      .slice(COMMAND_PREFIX.length)
      .trim()
      .split(/ +/);
    const commandName = args.shift().toLowerCase();

    logger.info(
      `Received command: ${commandName} from ${message.author.tag} in ${message.channel.name} with arguments: ${args}`
    );

    const command = client.commands.get(commandName);

    if (!command) {
      logger.warn(`No command found for ${commandName}`);
      message.reply(
        `I don't recognize the command \`${commandName}\`. Try \`${COMMAND_PREFIX}help\` for a list of commands.`
      );
      return;
    }

    // Implement command cooldowns
    if (!cooldowns.has(command.data.name)) {
      cooldowns.set(command.data.name, new Collection());
    }

    const now = Date.now();
    const timestamps = cooldowns.get(command.data.name);
    const cooldownAmount = (command.cooldown || 3) * 1000; // Default cooldown is 3 seconds

    if (timestamps.has(message.author.id)) {
      const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

      if (now < expirationTime) {
        const timeLeft = ((expirationTime - now) / 1000).toFixed(1);
        return message.reply(
          `Please wait ${timeLeft} more second(s) before reusing the \`${command.data.name}\` command.`
        );
      }
    }

    timestamps.set(message.author.id, now);
    setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

    try {
      await command.execute(message, args, client);
      logger.info(`Executed command: ${commandName}`);
    } catch (error) {
      logger.error(`Error executing command ${commandName}: ${error.message}`);
      message.reply(
        'An unexpected error occurred while executing that command.'
      );
    }
  },
};
