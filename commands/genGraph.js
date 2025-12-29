// commands/gengraph.js
import { generateLPGraph } from '../utils/generateImage.js';
import { AttachmentBuilder, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import Account from '../models/Account.js';
import logger from '../utils/logger.js';

const childLogger = logger.child({ label: 'commands/gengraph' });

export default {
  data: new SlashCommandBuilder()
    .setName('gengraph')
    .setDescription('Generate and display LP history graph for a summoner')
    .addStringOption(option =>
      option
        .setName('summoner')
        .setDescription('Summoner name in format: GameName#TagLine')
        .setRequired(true)
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    await interaction.deferReply();

    const query = interaction.options.getString('summoner').replace(/\s+/g, '');
    const parts = query.split('#');
    const gameName = parts[0];
    const tagLine = parts[1] || undefined;

    try {
      const account = await Account.findOne(tagLine ? { gameName, tagLine } : { gameName });
      if (!account) {
        await interaction.editReply({
          content: '❌  No tracked account matches that name.',
        });
        return;
      }
      if (!account.lpHistory?.length) {
        await interaction.editReply({
          content: '❌  This account has no LP history yet.',
        });
        return;
      }

      const png = await generateLPGraph(
        account.lpHistory,
        `${account.gameName}#${account.tagLine}`
      );
      const attach = new AttachmentBuilder(png, { name: 'lp-graph.png' });

      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle(`${account.gameName}#${account.tagLine} – LP History`)
        .setImage('attachment://lp-graph.png')
        .setTimestamp();

      await interaction.editReply({ embeds: [embed], files: [attach] });
    } catch (err) {
      childLogger.error(`gengraph failed → ${err.stack || err}`);
      await interaction.editReply({
        content: '❌  An error occurred while generating the graph.',
      });
    }
  },
};
