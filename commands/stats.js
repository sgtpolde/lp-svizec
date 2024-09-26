const Account = require('../models/Account');
const GuildSettings = require('../models/GuildSettings');
const { EmbedBuilder } = require('discord.js');
const {
  getMatchHistory,
  getMatchDetails,
  getRankedStats,
} = require('../utils/riotApi');
const logger = require('../utils/logger');

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

          // Fetch current LP
          const rankedStats = await getRankedStats(summonerId, region);
          const soloQueueStats = rankedStats.find(
            (queue) => queue.queueType === 'RANKED_SOLO_5x5'
          );

          let currentLP = account.lastLP || 0;
          let lpChange = null;
          let rank = 'Unranked';
          let tier = 'Unranked';
          let division = '';

          if (soloQueueStats) {
            currentLP = soloQueueStats.leaguePoints;
            tier = capitalizeFirstLetter(soloQueueStats.tier.toLowerCase());
            division = soloQueueStats.rank;
            rank = `${tier} ${division}`;
            lpChange = currentLP - (account.lastLP || 0);
            account.lastLP = currentLP;
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
              lpChangeText = `${lpChangeEmoji} ${lpChange > 0 ? '+' : ''}${lpChange} LP`;
            }

            // LP Progress Bar
            const lpProgressBar = createProgressBar(currentLP % 100, 100, 10);
            const maxCsPerMinute = 10; // You can adjust this value
            const csProgressBar = createProgressBar(csPerMinute, maxCsPerMinute, 10);
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
                  value: `📈 ${csPerMinute} cs/min\n${csProgressBar}`, // Added CS per minute with progress bar
                  inline: true,
                },
                {
                  name: 'Vision Score',
                  value: `👁️ ${visionScore}`,
                  inline: true,
                }
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

    // Helper function to capitalize the first letter
    function capitalizeFirstLetter(string) {
      return string.charAt(0).toUpperCase() + string.slice(1);
    }

    // Helper function to format game duration
    function formatGameDuration(seconds) {
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${minutes}m ${secs}s`;
    }

    // Helper function to create a progress bar
    function createProgressBar(value, maxValue, size) {
      const percentage = Math.min(value / maxValue, 1);
      const filledBars = Math.round(size * percentage);
      const emptyBars = size - filledBars;
      const progressBar = '█'.repeat(filledBars) + '░'.repeat(emptyBars);
      return `\`${progressBar}\` ${Math.round(percentage * 100)}%`;
    }
  },
};
