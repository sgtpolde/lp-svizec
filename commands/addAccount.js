// commands/addAccount.js
const Account = require('../models/Account');
const {
  getPUUIDByRiotID,
  getSummonerByPUUID,
  getRankedStats,
} = require('../utils/riotApi');
const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  data: {
    name: 'addaccount',
    description: 'Add a League of Legends account to track',
  },
  /**
   * Execute the add account command with updated LP tracking.
   * @param {Message} message
   * @param {string[]} args
   * @param {Client} client
   */
  async execute(message, args, client) {
    try {
      // Check if the bot has permission to manage messages
      if (
        !message.guild.members.me.permissions.has(
          PermissionsBitField.Flags.ManageMessages
        )
      ) {
        return message.reply(
          '❌ I need the **Manage Messages** permission to delete messages.'
        );
      }

      // Check if all required arguments are provided
      if (args.length < 3) {
        await message.reply(
          '❌ Usage: `!addaccount <GameName> <TagLine> <Region>`\nExample: `!addaccount SummonerName 1234 euw`'
        );
        // Delete the user's command message after sending the usage message
        await message.delete().catch(console.error);
        return;
      }

      const [gameName, tagLine, regionInput] = args;
      const region = regionInput.toLowerCase();

      // Validate region
      const validRegions = [
        'na',
        'euw',
        'eun',
        'kr',
        'jp',
        'oce',
        'br',
        'lan',
        'las',
        'ru',
        'tr',
      ];

      if (!validRegions.includes(region)) {
        await message.reply(
          `❌ Invalid server. Valid servers are: ${validRegions.join(', ')}`
        );
        // Delete the user's command message after sending the error message
        await message.delete().catch(console.error);
        return;
      }

      // Inform the user that we're processing their account
      const processingMessage = await message.channel.send(
        '🔄 Processing your account. Please wait...'
      );

      // Get PUUID using Riot ID
      const accountData = await getPUUIDByRiotID(gameName, tagLine);
      const puuid = accountData.puuid;

      // Get Summoner data using PUUID and region
      const summonerData = await getSummonerByPUUID(puuid, region);

      // Check if the account already exists
      const existingAccount = await Account.findOne({
        discordId: message.author.id,
        puuid,
        region,
      });

      if (existingAccount) {
        await processingMessage.delete().catch(console.error);
        await message.reply('⚠️ This account is already being tracked.');
        // Delete the user's command message
        await message.delete().catch(console.error);
        return;
      }

      // Get current LP and rank
      const rankedStats = await getRankedStats(summonerData.id, region);
      const soloQueueStats = rankedStats.find(
        (queue) => queue.queueType === 'RANKED_SOLO_5x5'
      );

      let lastLP = null;
      let rank = 'Unranked';
      let lpHistory = [];

      if (soloQueueStats) {
        lastLP = soloQueueStats.leaguePoints;
        rank = `${capitalizeFirstLetter(
          soloQueueStats.tier.toLowerCase()
        )} ${soloQueueStats.rank}`;

        // Initialize lpHistory with the current LP record
        lpHistory.push({
          lp: lastLP,
          timestamp: new Date(),
          rank: rank,
        });
      }

      const account = new Account({
        discordId: message.author.id,
        gameName,
        tagLine,
        region,
        puuid,
        summonerId: summonerData.id,
        lastMatchId: null,
        lastLP,
        lpHistory, // Include the lpHistory array
      });

      await account.save();

      // Delete the processing message and the user's command message
      await processingMessage.delete().catch(console.error);
      await message.delete().catch(console.error);

      // Send a detailed confirmation message using an embed
      const confirmationEmbed = new EmbedBuilder()
        .setColor('#00FF00') // Green color
        .setTitle('✅ Account Added Successfully!')
        .addFields(
          { name: 'Riot ID', value: `${gameName}#${tagLine}`, inline: true },
          { name: 'Region', value: region.toUpperCase(), inline: true },
          {
            name: 'Current Rank',
            value: `${rank}${lastLP !== null ? ` (${lastLP} LP)` : ''}`,
            inline: true,
          }
        )
        .setThumbnail(
          `https://ddragon.leagueoflegends.com/cdn/13.21.1/img/profileicon/${summonerData.profileIconId}.png`
        )
        .setFooter({ text: `Summoner Level: ${summonerData.summonerLevel}` })
        .setTimestamp();

      await message.channel.send({ embeds: [confirmationEmbed] });
    } catch (error) {
      logger.error(`Error in addAccount command: ${error}`);
      // Delete the processing message and the user's command message
      await message.delete().catch(console.error);
      await processingMessage?.delete().catch(console.error);

      if (error.response && error.response.status === 404) {
        await message.reply(
          '❌ Account not found. Please check the game name, tag line, and server.'
        );
      } else if (error.response && error.response.status === 403) {
        await message.reply('❌ Invalid or expired Riot API key.');
      } else {
        await message.reply('❌ An error occurred while adding the account.');
      }
    }

    // Helper function to capitalize the first letter
    function capitalizeFirstLetter(string) {
      return string.charAt(0).toUpperCase() + string.slice(1);
    }
  },
};
