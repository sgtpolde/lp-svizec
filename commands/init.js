// commands/init.js

import { EmbedBuilder, MessageFlags, PermissionsBitField, SlashCommandBuilder } from 'discord.js';
import GuildSettings from '../models/GuildSettings.js';
import logger from '../utils/logger.js';

const childLogger = logger.child({ label: 'commands/init' });

export default {
  data: new SlashCommandBuilder()
    .setName('init')
    .setDescription('Bind the bot to the current channel for automated updates')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: '❌  This command can only be used inside a server.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      await interaction.reply({
        content: '❌  You need **Administrator** permission to run this.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const guildId = interaction.guild.id;
    const channelId = interaction.channel.id;

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

      await interaction.reply({ embeds: [embed] });
      childLogger.info(`${title} for guild ${guildId} → channel ${channelId}`);
    } catch (err) {
      childLogger.error(`Init failed in guild ${guildId} – ${err.stack || err}`);
      await interaction.reply({
        content: '❌  An error occurred while initialising the bot.',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
