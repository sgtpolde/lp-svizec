// commands/gengraph.js
const { generateLPGraph } = require('../utils/generateImage');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const Account = require('../models/Account');

module.exports = {
  data: {
    name: 'gengraph',
    description: 'Generate and display LP graph for a summoner',
  },
  async execute(message, args) {
    const summonerName = args.join(' ');

    if (!summonerName) {
      return message.reply('❌ You must provide a summoner name.');
    }

    try {
      const account = await Account.findOne({ gameName: summonerName });

      if (!account) {
        return message.reply('❌ No account found for the given summoner name.');
      }

      if (!account.lpHistory || account.lpHistory.length === 0) {
        return message.reply('No LP history found for this account.');
      }

      const lpGraphBuffer = await generateLPGraph(account.lpHistory);

      const attachment = new AttachmentBuilder(lpGraphBuffer, { name: 'lp-graph.png' });

      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`${account.gameName}#${account.tagLine} - LP Graph`)
        .setDescription(`Displaying the LP history graph for ${account.gameName}#${account.tagLine}`)
        .setImage('attachment://lp-graph.png')
        .setTimestamp();

      await message.reply({ embeds: [embed], files: [attachment] });
    } catch (error) {
      console.error(error);
      return message.reply('❌ An error occurred while generating the graph.');
    }
  },
};
