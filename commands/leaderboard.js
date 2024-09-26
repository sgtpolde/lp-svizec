// commands/leaderboard.js
const Account = require('../models/Account');
const { EmbedBuilder } = require('discord.js');

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
        const { gameName, tagLine, region, lpHistory } = account;

        // Get the latest LP record
        const latestLPRecord =
          lpHistory && lpHistory.length > 0
            ? lpHistory[lpHistory.length - 1]
            : null;

        if (latestLPRecord) {
          rankings.push({
            summonerName: `${gameName}#${tagLine}`,
            region: region.toUpperCase(),
            tier: latestLPRecord.rank
              ? latestLPRecord.rank.split(' ')[0]
              : 'Unranked',
            rank: latestLPRecord.rank ? latestLPRecord.rank.split(' ')[1] : '',
            leaguePoints: latestLPRecord.lp,
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
      }

      // Sort rankings using rank score (as previously implemented)
      rankings.sort((a, b) => {
        const rankScoreA = getRankScore(a.tier, a.rank, a.leaguePoints);
        const rankScoreB = getRankScore(b.tier, b.rank, b.leaguePoints);
        return rankScoreB - rankScoreA;
      });

      const embed = new EmbedBuilder()
        .setTitle('🏆 Leaderboard')
        .setColor('#FFD700') // Gold color
        .setDescription(
          rankings
            .map(
              (acc, index) =>
                `**${index + 1}. ${acc.summonerName} (${acc.region})** - ${
                  acc.tier !== 'Unranked'
                    ? `${capitalizeFirstLetter(
                        acc.tier.toLowerCase()
                      )} ${acc.rank} (${acc.leaguePoints} LP)`
                    : 'Unranked'
                }`
            )
            .join('\n')
        )
        .setTimestamp();

      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      message.reply('❌ An error occurred while generating the leaderboard.');
    }

    // Helper function to capitalize the first letter
    function capitalizeFirstLetter(string) {
      return string.charAt(0).toUpperCase() + string.slice(1);
    }

    // Helper function to calculate rank score
    function getRankScore(tier, division, leaguePoints) {
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

      const divisions = {
        I: 4,
        II: 3,
        III: 2,
        IV: 1,
      };

      let tierValue = tiers.indexOf(tier.toUpperCase());

      // If tier not found (Unranked), assign lowest value
      if (tierValue === -1) {
        tierValue = -1;
      }

      let divisionValue = 0;
      if (tierValue >= 0 && tierValue <= 5) {
        // Tiers from IRON to DIAMOND
        divisionValue = divisions[division] || 0;
      } else if (tierValue >= 6) {
        // MASTER, GRANDMASTER, CHALLENGER
        divisionValue = 5; // Highest division value
      } else {
        divisionValue = 0; // Unranked
      }

      // Normalize LP (add small value to differentiate within same division)
      const lpValue = leaguePoints / 1000;

      // Calculate rank score
      return tierValue * 100 + divisionValue * 10 + lpValue;
    }
  },
};
