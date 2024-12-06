// commands/init.js
const GuildSettings = require('../models/GuildSettings');
const { PermissionsBitField } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  data: {
    name: 'init',
    description: 'Initialize the bot in the current channel',
  },
  /**
   * Execute the init command.
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   */
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply('❌ You do not have permission to use this command.');
    }

    const guildId = message.guild.id;
    const channelId = message.channel.id;

    try {
      let settings = await GuildSettings.findOne({ guildId });

      if (settings) {
        settings.channelId = channelId;
        await settings.save();
        await message.reply('✅ Bot has been re-initialized in this channel.');
      } else {
        settings = new GuildSettings({ guildId, channelId });
        await settings.save();
        await message.reply('✅ Bot has been initialized in this channel.');
      }
    } catch (error) {
      logger.error(`Error initializing bot in guild ${guildId}: ${error.message}`);
      await message.reply('❌ An error occurred while initializing the bot.');
    }
  },
};
