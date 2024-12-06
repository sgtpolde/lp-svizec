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
   * Execute the addAccount command.
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
  async execute(message, args, client) {
    let processingMessage;
    try {
      // Check bot permissions
      if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        await message.reply('❌ I need the **Manage Messages** permission to delete messages.');
        return;
      }

      // Validate arguments
      if (args.length < 3) {
        await message.reply(
          '❌ Usage: `!addaccount <GameName> <TagLine> <Region>`\nExample: `!addaccount SummonerName 1234 euw`'
        );
        await safeDeleteMessage(message);
        return;
      }

      const [gameName, tagLine, regionInput] = args;
      const region = regionInput.toLowerCase();

      const validRegions = [
        'na', 'euw', 'eun', 'kr', 'jp', 'oce', 'br', 'lan', 'las', 'ru', 'tr',
      ];

      if (!validRegions.includes(region)) {
        await message.reply(`❌ Invalid server. Valid servers: ${validRegions.join(', ')}`);
        await safeDeleteMessage(message);
        return;
      }

      // Indicate processing
      processingMessage = await message.channel.send('🔄 Processing your account. Please wait...');

      // Fetch account data
      const accountData = await getPUUIDByRiotID(gameName, tagLine);
      const puuid = accountData.puuid;

      // Summoner data
      const summonerData = await getSummonerByPUUID(puuid, region);

      // Check if account already tracked
      const existingAccount = await Account.findOne({
        discordId: message.author.id,
        puuid,
        region,
      });

      if (existingAccount) {
        await safeDeleteMessage(processingMessage);
        await message.reply('⚠️ This account is already being tracked.');
        await safeDeleteMessage(message);
        return;
      }

      // Get LP and rank
      const rankedStats = await getRankedStats(summonerData.id, region);
      const soloQueueStats = rankedStats.find((queue) => queue.queueType === 'RANKED_SOLO_5x5');

      let lastLP = null;
      let rank = 'Unranked';
      const lpHistory = [];

      if (soloQueueStats) {
        lastLP = soloQueueStats.leaguePoints;
        rank = `${capitalizeFirstLetter(soloQueueStats.tier.toLowerCase())} ${soloQueueStats.rank}`;
        lpHistory.push({
          lp: lastLP,
          timestamp: new Date(),
          rank,
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
        lpHistory,
      });

      await account.save();

      // Clean up
      await safeDeleteMessage(processingMessage);
      await safeDeleteMessage(message);

      // Confirmation embed
      const confirmationEmbed = new EmbedBuilder()
        .setColor('#00FF00')
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
      logger.error(`Error in addAccount command: ${error.stack || error}`);
      await safeDeleteMessage(processingMessage);
      await safeDeleteMessage(message);

      let errorMessage = '❌ An error occurred while adding the account.';
      if (error.response) {
        if (error.response.status === 404) {
          errorMessage = '❌ Account not found. Check the name, tag, and server.';
        } else if (error.response.status === 403) {
          errorMessage = '❌ Invalid or expired Riot API key.';
        }
      }

      if (message && message.channel) {
        try {
          await message.reply(errorMessage);
        } catch (replyError) {
          logger.error(`Failed to reply: ${replyError.message}`);
        }
      }
    }
  },
};

/**
 * Safely delete a message if possible.
 * @param {import('discord.js').Message} msg
 */
async function safeDeleteMessage(msg) {
  if (msg && msg.deletable) {
    try {
      await msg.delete();
    } catch (error) {
      logger.warn(`Failed to delete message: ${error.message}`);
    }
  }
}

/**
 * Capitalize the first letter of a string.
 * @param {string} string
 * @returns {string}
 */
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
