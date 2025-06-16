// commands/removeAccount.js

const Account = require('../models/Account');
const { EmbedBuilder } = require('discord.js');
const { VALID_REGIONS, REGION_ALIASES } = require('../utils/constants');
const logger = require('../utils/logger').child({ label: 'commands/removeAccount' });

module.exports = {
  data: {
    name: 'removeaccount',
    description: 'Stop tracking a League of Legends account',
  },

  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   */
  async execute(message, args) {
    if (args.length < 3) {
      await message.reply('❌  Usage: `!removeaccount <GameName> <TagLine> <Region>`');
      return;
    }

    const [gameName, tagLine, rawRegion] = args;
    const region = REGION_ALIASES[rawRegion.toLowerCase()] || rawRegion.toLowerCase();

    if (!VALID_REGIONS.includes(region)) {
      await message.reply(`❌  Invalid region. Valid regions: ${VALID_REGIONS.join(', ')}`);
      return;
    }

    try {
      const removed = await Account.findOneAndDelete({
        discordId: message.author.id,
        gameName,
        tagLine,
        region,
      });

      const embed = new EmbedBuilder()
        .setColor(removed ? 0x57f287 : 0xed4245)
        .setTitle(removed ? '✅  Account removed' : '⚠️  Account not found')
        .setDescription(`${gameName}#${tagLine} (${region.toUpperCase()})`)
        .setTimestamp();

      await message.reply({ embeds: [embed] });
      logger.info(
        `${removed ? 'Removed' : 'Not found'} account ${gameName}#${tagLine} (${region}) for ${message.author.tag}`
      );
    } catch (err) {
      logger.error(`removeAccount failed → ${err.stack || err}`);
      await message.reply('❌  An error occurred while removing the account.');
    }
  },
};
