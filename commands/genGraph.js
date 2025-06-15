// commands/gengraph.js
const { generateLPGraph } = require('../utils/generateImage');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const Account = require('../models/Account');
const logger = require('../utils/logger').child({ label: 'commands/gengraph' });

module.exports = {
  data: {
    name: 'gengraph',
    description: 'Generate and display LP history graph for a summoner',
  },

  /** @param {import('discord.js').Message} message @param {string[]} args */
  async execute(message, args) {
    const query = args.join(' ').replace(/\s+/g, ''); // trim spaces around #
    if (!query) {
      await message.reply('❌  Usage: `!gengraph <SummonerName[#TagLine]>`');
      return;
    }

    let [gameName, tagLine] = query.split('#');
    tagLine = tagLine ?? undefined; // undefined if not supplied

    try {
      const account = await Account.findOne(tagLine ? { gameName, tagLine } : { gameName });
      if (!account) {
        await message.reply('❌  No tracked account matches that name.');
        return;
      }
      if (!account.lpHistory?.length) {
        await message.reply('❌  This account has no LP history yet.');
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

      await message.reply({ embeds: [embed], files: [attach] });
    } catch (err) {
      logger.error(`gengraph failed → ${err.stack || err}`);
      await message.reply('❌  An error occurred while generating the graph.');
    }
  },
};
