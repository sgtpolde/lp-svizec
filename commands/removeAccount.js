// commands/removeAccount.js

import Account from '../models/Account.js';
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { VALID_REGIONS, REGION_ALIASES } from '../utils/constants.js';
import logger from '../utils/logger.js';

const childLogger = logger.child({ label: 'commands/removeAccount' });

export default {
  data: new SlashCommandBuilder()
    .setName('removeaccount')
    .setDescription('Stop tracking a League of Legends account')
    .addStringOption(option =>
      option
        .setName('gamename')
        .setDescription('The summoner game name (without tag)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('tagline')
        .setDescription('The summoner tag line (without #)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('region')
        .setDescription('The server region')
        .setRequired(true)
        .addChoices(...VALID_REGIONS.map(r => ({ name: r.toUpperCase(), value: r })))
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const gameName = interaction.options.getString('gamename');
    const tagLine = interaction.options.getString('tagline');
    const rawRegion = interaction.options.getString('region');
    const region = REGION_ALIASES[rawRegion.toLowerCase()] || rawRegion.toLowerCase();

    try {
      const removed = await Account.findOneAndDelete({
        discordId: interaction.user.id,
        gameName,
        tagLine,
        region,
      });

      const embed = new EmbedBuilder()
        .setColor(removed ? 0x57f287 : 0xed4245)
        .setTitle(removed ? '✅  Account removed' : '⚠️  Account not found')
        .setDescription(`${gameName}#${tagLine} (${region.toUpperCase()})`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      childLogger.info(
        `${removed ? 'Removed' : 'Not found'} account ${gameName}#${tagLine} (${region}) for ${interaction.user.tag}`
      );
    } catch (err) {
      childLogger.error(`removeAccount failed → ${err.stack || err}`);
      await interaction.reply({
        content: '❌  An error occurred while removing the account.',
        ephemeral: true,
      });
    }
  },
};
