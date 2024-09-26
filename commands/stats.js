// commands/stats.js
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
        const { region, puuid, summonerId, gameName, tagLine, discordId } =
          account;

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

          if (soloQueueStats) {
            currentLP = soloQueueStats.leaguePoints;
            rank = `${capitalizeFirstLetter(
              soloQueueStats.tier.toLowerCase()
            )} ${soloQueueStats.rank}`;
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
            const damageDealt = participant.totalDamageDealtToChampions;
            const visionScore = participant.visionScore;

            // Create a nicely formatted embed
            const embed = new EmbedBuilder()
              .setColor(participant.win ? '#00FF00' : '#FF0000')
              .setTitle(`${gameName}#${tagLine} - ${result} in Ranked Solo/Duo`)
              .setDescription(
                `**KDA**: ${kda}\n**LP Change**: ${
                  lpChange !== null
                    ? `${lpChange > 0 ? '+' : ''}${lpChange} LP`
                    : 'N/A'
                }`
              )
              .addFields(
                { name: 'Champion', value: championName, inline: true },
                { name: 'Current Rank', value: rank, inline: true },
                {
                  name: 'CS (CS per Minute)',
                  value: `${cs} (${csPerMinute})`,
                  inline: true,
                },
                {
                  name: 'Total Damage Dealt',
                  value: damageDealt.toString(),
                  inline: true,
                },
                {
                  name: 'Vision Score',
                  value: visionScore.toString(),
                  inline: true,
                }
              )
              .setThumbnail(
                `https://ddragon.leagueoflegends.com/cdn/13.21.1/img/champion/${championName}.png`
              )
              .setFooter({
                text: `Game Duration: ${formatGameDuration(matchDetails.info.gameDuration)}`,
              })
              .setTimestamp();

            // Determine the guild(s) where the user is a member
            const user = await client.users.fetch(discordId);
            const mutualGuilds = client.guilds.cache.filter((guild) =>
              guild.members.cache.has(discordId)
            );

            // Send the embed to the initialized channel in each mutual guild
            for (const [guildId, guild] of mutualGuilds) {
              const channelId = guildSettingsMap.get(guildId);
              if (channelId) {
                const channel = await guild.channels.fetch(channelId);
                if (channel) {
                  await channel.send({ embeds: [embed] }).catch((err) => {
                    logger.error(
                      `Failed to send message to channel ${channelId}: ${err}`
                    );
                  });
                } else {
                  logger.warn(`Channel not found: ${channelId}`);
                }
              } else {
                logger.warn(`No initialized channel for guild ${guildId}`);
              }
            }
          }
        }
      }

      if (message) {
        await message.reply('✅ Stats updated successfully.');
      }
    } catch (error) {
      logger.error(`Error in stats command: ${error}`);
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
  },
};
