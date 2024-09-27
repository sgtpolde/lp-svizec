const Account = require('../models/Account');
const GuildSettings = require('../models/GuildSettings');
const { EmbedBuilder } = require('discord.js');
const {
  getMatchHistory,
  getMatchDetails,
  getRankedStats,
} = require('../utils/riotApi');
const logger = require('../utils/logger');

// Tier and Division mappings
const tierOrder = {
  IRON: 0,
  BRONZE: 1,
  SILVER: 2,
  GOLD: 3,
  PLATINUM: 4,
  DIAMOND: 5,
  MASTER: 6,
  GRANDMASTER: 7,
  CHALLENGER: 8,
  UNRANKED: -1,
};

const divisionOrder = {
  IV: 0,
  III: 1,
  II: 2,
  I: 3,
};

module.exports = {
  data: {
    name: 'stats',
    description: 'Fetch and display stats for tracked accounts',
  },
  /**
   * Execute the stats command.
   * @param {Message|null} message
   * @param {string[]|null} args
   * @param {Client} client
   */
  async execute(message, args, client) {
    try {
      const accounts = await Account.find();

      // Fetch all guild settings
      const guildSettings = await GuildSettings.find();
      const guildSettingsMap = new Map();
      guildSettings.forEach((setting) => {
        guildSettingsMap.set(setting.guildId, setting.channelId);
      });

      for (const account of accounts) {
        const { region, puuid, summonerId, gameName, tagLine } = account;

        // Fetch match history, filtering for ranked solo/duo games
        const matchHistory = await getMatchHistory(puuid, region, 'ranked');

        const newMatches = [];

        // Check for new matches
        for (const matchId of matchHistory) {
          if (matchId === account.lastMatchId) break;
          newMatches.push(matchId);
        }

        if (newMatches.length > 0) {
          // Update lastMatchId
          account.lastMatchId = newMatches[0];

          // Fetch current LP and rank
          const rankedStats = await getRankedStats(summonerId, region);
          const soloQueueStats = rankedStats.find(
            (queue) => queue.queueType === 'RANKED_SOLO_5x5'
          );

          let currentLP = 0;
          let currentTier = 'UNRANKED';
          let currentDivision = '';
          let rank = 'Unranked';
          let lpChange = null;

          if (soloQueueStats) {
            currentLP = soloQueueStats.leaguePoints;
            currentTier = soloQueueStats.tier.toUpperCase();
            currentDivision = soloQueueStats.rank.toUpperCase();
            rank = `${capitalizeFirstLetter(currentTier.toLowerCase())} ${currentDivision}`;

            const currentTotalLP = calculateTotalLP(
              currentTier,
              currentDivision,
              currentLP
            );

            // Retrieve last known rank details from the account
            const lastLP = account.lastLP || 0;
            const lastTier = account.lastTier || 'UNRANKED';
            const lastDivision = account.lastDivision || 'IV';

            const lastTotalLP = calculateTotalLP(
              lastTier,
              lastDivision,
              lastLP
            );

            lpChange = currentTotalLP - lastTotalLP;

            // Update account with current rank details
            account.lastLP = currentLP;
            account.lastTier = currentTier;
            account.lastDivision = currentDivision;

            // Update lpHistory
            account.lpHistory = account.lpHistory || [];
            account.lpHistory.push({
              lp: currentLP,
              timestamp: new Date(),
              matchId: newMatches[0],
              lpChange: lpChange,
              rank: rank,
            });

            // Limit lpHistory length
            const maxHistoryLength = 100;
            if (account.lpHistory.length > maxHistoryLength) {
              account.lpHistory.shift();
            }
          } else {
            // Handle unranked players
            const currentTotalLP = 0;
            const lastLP = account.lastLP || 0;
            const lastTier = account.lastTier || 'UNRANKED';
            const lastDivision = account.lastDivision || '';
            const lastTotalLP = calculateTotalLP(
              lastTier,
              lastDivision,
              lastLP
            );

            lpChange = currentTotalLP - lastTotalLP;

            // Update account with current rank details
            account.lastLP = currentLP;
            account.lastTier = currentTier;
            account.lastDivision = currentDivision;
          }

          // Save account updates
          await account.save();

          // Fetch and report new matches
          for (const matchId of newMatches.reverse()) {
            const matchDetails = await getMatchDetails(matchId, region);

            // Skip if the game mode is not ranked solo/duo
            if (matchDetails.info.queueId !== 420) {
              continue;
            }

            const participant = matchDetails.info.participants.find(
              (p) => p.puuid === puuid
            );

            if (!participant) continue;

            const kda = `${participant.kills}/${participant.deaths}/${participant.assists}`;
            const result = participant.win ? 'Victory' : 'Defeat';
            const championName = participant.championName;

            // Additional stats
            const cs =
              participant.totalMinionsKilled + participant.neutralMinionsKilled;
            const csPerMinute = (
              cs /
              (matchDetails.info.gameDuration / 60)
            ).toFixed(1);
            const visionScore = participant.visionScore;
            const killParticipation = (
              ((participant.kills + participant.assists) /
                matchDetails.info.teams.find(
                  (t) => t.teamId === participant.teamId
                ).objectives.champion.kills) *
              100
            ).toFixed(1);

            // LP Change Indicator
            let lpChangeText = 'N/A';
            let lpChangeEmoji = '';
            if (lpChange !== null) {
              lpChangeEmoji =
                lpChange > 0
                  ? '🔼' // Up arrow for LP gain
                  : lpChange < 0
                    ? '🔽' // Down arrow for LP loss
                    : '⏺️'; // Dot for no change
              lpChangeText = `${lpChangeEmoji} ${
                lpChange > 0 ? '+' : ''
              }${lpChange} LP`;
            }

            // LP Progress Bar
            const lpProgressBar = createProgressBar(currentLP % 100, 100, 10);
            const maxCsPerMinute = 10; // Adjust as needed
            const csProgressBar = createProgressBar(
              csPerMinute,
              maxCsPerMinute,
              10
            );

            // Get the last 5 LP records
            const recentLpHistory = account.lpHistory.slice(-5);

            // Create a string representation
            const lpHistoryString = recentLpHistory
              .map(
                (record) =>
                  `${formatDateTime(record.timestamp)}: ${
                    record.lp
                  } LP (${record.lpChange > 0 ? '+' : ''}${record.lpChange} LP)`
              )
              .join('\n');

            // Create the embed
            const embed = new EmbedBuilder()
              .setColor(participant.win ? '#00FF00' : '#FF0000')
              .setTitle(`${gameName}#${tagLine} - ${result}`)
              .setDescription(
                `**Rank:** ${rank} (${currentLP} LP)\n**LP Change:** ${lpChangeText}\n**LP Progress:** ${lpProgressBar}`
              )
              .addFields(
                {
                  name: 'Champion',
                  value: championName,
                  inline: true,
                },
                {
                  name: 'KDA',
                  value: `⚔️ ${kda}`,
                  inline: true,
                },
                {
                  name: 'Kill Participation',
                  value: `${killParticipation}%`,
                  inline: true,
                },
                {
                  name: 'CS per Minute',
                  value: `📈 ${csPerMinute} cs/min\n${csProgressBar}`,
                  inline: true,
                },
                {
                  name: 'Vision Score',
                  value: `👁️ ${visionScore}`,
                  inline: true,
                }
                /*{
                  name: 'Recent LP History',
                  value: lpHistoryString || 'No LP history available.',
                  inline: false,
                }*/
              )
              .setThumbnail(
                `https://ddragon.leagueoflegends.com/cdn/13.21.1/img/champion/${championName}.png`
              )
              .setFooter({
                text: `Game Duration: ${formatGameDuration(
                  matchDetails.info.gameDuration
                )}`,
              })
              .setTimestamp();

            // Send the embed to the initialized channel in each guild
            for (const [guildId, channelId] of guildSettingsMap.entries()) {
              try {
                const guild = await client.guilds.fetch(guildId);
                const channel = await guild.channels.fetch(channelId);
                if (channel) {
                  await channel.send({ embeds: [embed] }).catch((err) => {
                    logger.error(
                      `Failed to send message to channel ${channelId}: ${err.message}`
                    );
                  });
                } else {
                  logger.warn(`Channel not found: ${channelId}`);
                }
              } catch (error) {
                logger.error(
                  `Error sending message to guild ${guildId}: ${error.message}`
                );
              }
            }
          }
        }
      }

      if (message) {
        await message.reply('✅ Stats updated successfully.');
      }
    } catch (error) {
      logger.error(`Error in stats command: ${error.stack || error}`);
      if (message) {
        await message.reply('❌ An error occurred while fetching stats.');
      }
    }

    // Helper functions
    function capitalizeFirstLetter(string) {
      return string.charAt(0).toUpperCase() + string.slice(1);
    }

    function formatGameDuration(seconds) {
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${minutes}m ${secs}s`;
    }

    function createProgressBar(value, maxValue, size) {
      const percentage = Math.min(value / maxValue, 1);
      const filledBars = Math.round(size * percentage);
      const emptyBars = size - filledBars;
      const progressBar = '█'.repeat(filledBars) + '░'.repeat(emptyBars);
      return `\`${progressBar}\` ${Math.round(percentage * 100)}%`;
    }

    function formatDateTime(date) {
      return new Date(date).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      });
    }

    function calculateTotalLP(tier, division, lp) {
      const tierIndex = tierOrder[tier.toUpperCase()] || -1;
      let totalLP = 0;

      if (tierIndex >= 0 && tierIndex <= 5 && division) {
        const divisionIndex = divisionOrder[division.toUpperCase()] || 0;
        totalLP = tierIndex * 400 + divisionIndex * 100 + lp;
      } else if (tierIndex >= 6) {
        // For Master and above, divisions don't exist
        totalLP = tierIndex * 400 + lp;
      } else {
        // Unranked or invalid tier
        totalLP = 0;
      }

      return totalLP;
    }
  },
};
