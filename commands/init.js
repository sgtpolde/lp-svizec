// commands/init.js
const GuildSettings = require('../models/GuildSettings');

module.exports = {
  data: {
    name: 'init',
    description: 'Initialize the bot in the current channel',
  },
  /**
   * Execute the init command.
   * @param {Message} message
   * @param {string[]} args
   */
  async execute(message, args) {
    // Check if the user has administrative permissions
    if (!message.member.permissions.has('Administrator')) {
      return message.reply('You do not have permission to use this command.');
    }

    const guildId = message.guild.id;
    const channelId = message.channel.id;

    try {
      // Check if settings already exist for this guild
      let settings = await GuildSettings.findOne({ guildId });

      if (settings) {
        // Update the channelId
        settings.channelId = channelId;
        await settings.save();
        message.reply(`Bot has been re-initialized in this channel.`);
      } else {
        // Create new settings
        settings = new GuildSettings({ guildId, channelId });
        await settings.save();
        message.reply(`Bot has been initialized in this channel.`);
      }
    } catch (error) {
      console.error(error);
      message.reply('An error occurred while initializing the bot.');
    }
  },
};
