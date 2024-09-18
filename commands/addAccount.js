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
   * Execute the add account command with message cleanup and improved messages.
   * @param {Message} message
   * @param {string[]} args
   * @param {Client} client
   */
  async execute(message, args, client) {
    const collectedMessages = [];

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

      // Collect input from the user
      const gameName = await collectInput(
        message,
        'Please enter your Riot ID **Game Name** (e.g., **SummonerName**):',
        collectedMessages
      );
      const tagLine = await collectInput(
        message,
        'Please enter your Riot ID **Tag Line** (e.g., **1234**):',
        collectedMessages
      );
      const regionInput = await collectInput(
        message,
        'Please enter your **Server/Region** (e.g., **euw**, **na**, **kr**):',
        collectedMessages
      );
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
        return;
      }

      // Inform the user that we're processing their account
      const processingMessage = await message.reply(
        '🔄 Processing your account. Please wait...'
      );
      collectedMessages.push(processingMessage);

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
        await message.reply('⚠️ This account is already being tracked.');
        return;
      }

      // Get current LP and rank
      const rankedStats = await getRankedStats(summonerData.id, region);
      const soloQueueStats = rankedStats.find(
        (queue) => queue.queueType === 'RANKED_SOLO_5x5'
      );

      let lastLP = null;
      let rank = 'Unranked';

      if (soloQueueStats) {
        lastLP = soloQueueStats.leaguePoints;
        rank = `${capitalizeFirstLetter(soloQueueStats.tier.toLowerCase())} ${soloQueueStats.rank}`;
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
      });

      await account.save();

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

      const finalMessage = await message.reply({ embeds: [confirmationEmbed] });
      collectedMessages.push(finalMessage);
    } catch (error) {
      logger.error(`Error in addAccount command: ${error}`);
      if (error instanceof TimeoutError) {
        await message.reply(
          '⏰ You did not respond in time. Please try the command again.'
        );
      } else if (error.response && error.response.status === 404) {
        await message.reply(
          '❌ Account not found. Please check the game name, tag line, and server.'
        );
      } else if (error.response && error.response.status === 403) {
        await message.reply('❌ Invalid or expired Riot API key.');
      } else {
        await message.reply('❌ An error occurred while adding the account.');
      }
    } finally {
      // Delete all collected messages after a delay
      setTimeout(async () => {
        for (const msg of collectedMessages) {
          await msg.delete().catch(console.error);
        }
      }, 5000); // Delay in milliseconds
    }

    // Helper function to collect input
    async function collectInput(message, promptText, collectedMessages) {
      const promptMessage = await message.reply(promptText);
      collectedMessages.push(promptMessage);

      const filter = (m) => m.author.id === message.author.id;
      try {
        const responseMessages = await message.channel.awaitMessages({
          filter,
          max: 1,
          time: 60000,
          errors: ['time'],
        });
        const response = responseMessages.first();
        collectedMessages.push(response);
        return response.content.trim();
      } catch (error) {
        throw new TimeoutError();
      }
    }

    // Custom TimeoutError class
    class TimeoutError extends Error {
      constructor(message) {
        super(message);
        this.name = 'TimeoutError';
      }
    }

    // Helper function to capitalize the first letter
    function capitalizeFirstLetter(string) {
      return string.charAt(0).toUpperCase() + string.slice(1);
    }
  },
};
