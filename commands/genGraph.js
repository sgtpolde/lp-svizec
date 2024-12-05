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

      // Generate LP graph
      const lpGraphBuffer = await generateLPGraph(account.lpHistory || []);

      // Create an attachment for the graph
      const attachment = new AttachmentBuilder(lpGraphBuffer, { name: 'lp-graph.png' });

      // Create an embed to show the summoner info
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`${account.gameName}#${account.tagLine} - LP Graph`)
        .setDescription(`Displaying the LP history graph for ${account.gameName}#${account.tagLine}`)
        .setImage('attachment://lp-graph.png')
        .setTimestamp();

      // Send the embed with the graph
      await message.reply({ embeds: [embed], files: [attachment] });
    } catch (error) {
      console.error(error);
      return message.reply('❌ An error occurred while generating the graph.');
    }
  },
};
