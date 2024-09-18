// commands/leaderboard.js
const Account = require('../models/Account');
const { MessageEmbed } = require('discord.js');
const { getRankedStats } = require('../utils/riotApi');

module.exports = {
  data: {
    name: 'leaderboard',
    description: 'Display the leaderboard of tracked accounts',
  },
  /**
   * Execute the leaderboard command.
   * @param {Message} message
   * @param {string[]} args
   */
  async execute(message, args) {
    try {
      const accounts = await Account.find();
      const rankings = [];

      for (const account of accounts) {
        const { region, summonerId, gameName, tagLine } = account;
        try {
          const rankedStats = await getRankedStats(summonerId, region);
          const soloQueueStats = rankedStats.find(queue => queue.queueType === 'RANKED_SOLO_5x5');

          if (soloQueueStats) {
            rankings.push({
              summonerName: `${gameName}#${tagLine}`,
              region: region.toUpperCase(),
              tier: soloQueueStats.tier,
              rank: soloQueueStats.rank,
              leaguePoints: soloQueueStats.leaguePoints,
            });
          } else {
            rankings.push({
              summonerName: `${gameName}#${tagLine}`,
              region: region.toUpperCase(),
              tier: 'Unranked',
              rank: '',
              leaguePoints: 0,
            });
          }
        } catch (error) {
          console.error(`Error fetching ranked data for ${gameName}#${tagLine}:`, error);
          rankings.push({
            summonerName: `${gameName}#${tagLine}`,
            region: region.toUpperCase(),
            tier: 'Unknown',
            rank: '',
            leaguePoints: 0,
          });
        }
      }

      // Sort rankings by tier and league points
      rankings.sort((a, b) => {
        const tiers = [
          'IRON',
          'BRONZE',
          'SILVER',
          'GOLD',
          'PLATINUM',
          'DIAMOND',
          'MASTER',
          'GRANDMASTER',
          'CHALLENGER',
        ];

        const tierA = tiers.indexOf(a.tier);
        const tierB = tiers.indexOf(b.tier);

        if (tierA !== tierB) {
          return tierB - tierA;
        } else {
          return b.leaguePoints - a.leaguePoints;
        }
      });

      const embed = new MessageEmbed()
        .setTitle('Leaderboard')
        .setDescription(
          rankings
            .map(
              (acc, index) =>
                `${index + 1}. ${acc.summonerName} (${acc.region}) - ${acc.tier} ${acc.rank} (${acc.leaguePoints} LP)`
            )
            .join('\n')
        )
        .setTimestamp();

      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      message.reply('An error occurred while generating the leaderboard.');
    }
  },
};
