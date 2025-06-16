// commands/init.js

const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const GuildSettings = require('../models/GuildSettings');
const logger = require('../utils/logger').child({ label: 'commands/init' });

module.exports = {
  data: {
    name: 'init',
    description: 'Bind the bot to the current channel for automated updates',
  },

  /**
   * @param {import('discord.js').Message} message
   */
  async execute(message) {
    if (!message.inGuild()) {
      await message.reply('❌  This command can only be used inside a server.');
      return;
    }

    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      await message.reply('❌  You need **Administrator** permission to run this.');
      return;
    }

    const guildId = message.guild.id;
    const channelId = message.channel.id;

    try {
      const settings = await GuildSettings.findOneAndUpdate(
        { guildId },
        { $set: { channelId } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      const title = settings.wasNew ? 'Initialised' : 'Channel updated';
      const embed = new EmbedBuilder()
        .setColor(0x57f287) // Discord green
        .setTitle(`✅  ${title}`)
        .setDescription(`Automated updates will now post in <#${channelId}>`)
        .setTimestamp();

      await message.reply({ embeds: [embed] });
      logger.info(`${title} for guild ${guildId} → channel ${channelId}`);
    } catch (err) {
      logger.error(`Init failed in guild ${guildId} – ${err.stack || err}`);
      await message.reply('❌  An error occurred while initialising the bot.');
    }
  },
};
