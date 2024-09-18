// commands/removeAccount.js
const Account = require('../models/Account');

module.exports = {
  data: {
    name: 'removeaccount',
    description: 'Remove a League of Legends account from tracking',
  },
  /**
   * Execute the remove account command.
   * @param {Message} message
   * @param {string[]} args
   */
  async execute(message, args) {
    if (args.length < 3) {
      return message.reply(
        'Usage: !removeaccount <gameName> <tagLine> <server>'
      );
    }

    const gameName = args[0];
    const tagLine = args[1];
    const region = args[2].toLowerCase();

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
      return message.reply(
        `Invalid server. Valid servers are: ${validRegions.join(', ')}`
      );
    }

    try {
      const account = await Account.findOneAndDelete({
        discordId: message.author.id,
        gameName,
        tagLine,
        region,
      });

      if (account) {
        message.reply(
          `Account ${gameName}#${tagLine} on ${region.toUpperCase()} removed successfully!`
        );
      } else {
        message.reply(
          `Account ${gameName}#${tagLine} on ${region.toUpperCase()} not found.`
        );
      }
    } catch (error) {
      console.error(error);
      message.reply('An error occurred while removing the account.');
    }
  },
};
