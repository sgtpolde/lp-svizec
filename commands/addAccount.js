// commands/addAccount.js
const Account = require('../models/Account');
const { getPUUIDByRiotID, getSummonerByPUUID, getRankedStats } = require('../utils/riotApi');

module.exports = {
  data: {
    name: 'addaccount',
    description: 'Add a League of Legends account to track',
  },
  /**
   * Execute the add account command with a helper.
   * @param {Message} message
   * @param {string[]} args
   */
  async execute(message, args) {
    const filter = m => m.author.id === message.author.id;

    try {
      // Step 1: Get gameName
      await message.reply('Please enter your Riot ID game name (e.g., SummonerName):');
      const gameNameMessage = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
      const gameName = gameNameMessage.first().content.trim();

      // Step 2: Get tagLine
      await message.reply('Please enter your Riot ID tag line (e.g., 1234):');
      const tagLineMessage = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
      const tagLine = tagLineMessage.first().content.trim();

      // Step 3: Get region
      await message.reply('Please enter your server/region (e.g., euw, na, kr):');
      const regionMessage = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
      const regionInput = regionMessage.first().content.trim().toLowerCase();

      // Validate region
      const validRegions = [
        'na', 'euw', 'eun', 'kr', 'jp', 'oce', 'br', 'lan', 'las', 'ru', 'tr',
      ];

      if (!validRegions.includes(regionInput)) {
        return message.reply(`Invalid server. Valid servers are: ${validRegions.join(', ')}`);
      }
      const region = regionInput;

      // Proceed with adding the account
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
        return message.reply('This account is already being tracked.');
      }

      // Get current LP
      const rankedStats = await getRankedStats(summonerData.id, region);
      const soloQueueStats = rankedStats.find(queue => queue.queueType === 'RANKED_SOLO_5x5');

      let lastLP = null;

      if (soloQueueStats) {
        lastLP = soloQueueStats.leaguePoints;
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
      message.reply(`Account ${gameName}#${tagLine} on ${region.toUpperCase()} added successfully!`);
    } catch (error) {
      console.error(error);

      if (error instanceof Map && error.size === 0) {
        // User did not respond in time
        message.reply('You did not respond in time. Please try the command again.');
      } else if (error.response && error.response.status === 404) {
        message.reply('Account not found. Please check the game name, tag line, and server.');
      } else if (error.response && error.response.status === 403) {
        message.reply('Invalid or expired Riot API key.');
      } else {
        message.reply('An error occurred while adding the account.');
      }
    }
  },
};
