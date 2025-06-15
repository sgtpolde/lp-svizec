// commands/addAccount.js
const Account = require('../models/Account');
const { getPUUIDByRiotID, getSummonerByPUUID, getRankedStats } = require('../utils/riotApi');
const { getDDragonVersion } = require('../utils/ddragon');
const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { VALID_REGIONS, REGION_ALIASES } = require('../utils/constants');
const { safeDeleteMessage, capitalizeFirst } = require('../utils/helpers');
const logger = require('../utils/logger').child({ label: 'commands/addAccount' });

module.exports = {
  data: {
    name: 'addaccount',
    description: 'Add a League of Legends account to track',
  },

  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   */
  async execute(message, args) {
    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      await message.reply('❌  I need **Manage Messages** permission to tidy up command messages.');
      return;
    }

    if (args.length < 3) {
      await message.reply(
        '❌  Usage: `!addaccount <GameName> <TagLine> <Region>`\n' +
          'Example: `!addaccount SummonerName 1234 euw`'
      );
      await safeDeleteMessage(message);
      return;
    }

    const [gameName, tagLine, rawRegion] = args;
    const region = REGION_ALIASES[rawRegion.toLowerCase()] || rawRegion.toLowerCase();
    if (!VALID_REGIONS.includes(region)) {
      await message.reply(`❌  Invalid region. Valid regions: ${VALID_REGIONS.join(', ')}`);
      await safeDeleteMessage(message);
      return;
    }

    const pending = await message.channel.send('🔄  Fetching account data…');

    try {
      const { puuid } = await getPUUIDByRiotID(gameName, tagLine);
      const summoner = await getSummonerByPUUID(puuid, region);

      if (await Account.findOne({ discordId: message.author.id, puuid, region })) {
        await pending.edit('⚠️  You already track that account.');
        await safeDeleteMessage(message);
        return;
      }

      const ranked = await getRankedStats(summoner.id, region);
      const solo = ranked.find(q => q.queueType === 'RANKED_SOLO_5x5');

      const account = new Account({
        discordId: message.author.id,
        gameName,
        tagLine,
        region,
        puuid,
        summonerId: summoner.id,
      });

      let rank = 'Unranked';
      if (solo) {
        rank = `${capitalizeFirst(solo.tier.toLowerCase())} ${solo.rank}`;
        account.addLPRecord({ lp: solo.leaguePoints, rank });
      }
      await account.save();

      /* ---------- thumbnail URL with fall‑back ---------- */
      const ddragonVer = getDDragonVersion();
      const iconId = summoner.profileIconId || 0;
      const thumbUrl = `https://ddragon.leagueoflegends.com/cdn/${ddragonVer}/img/profileicon/${iconId}.png`;
      // basic sanity check
      const validUrl = /^https:\/\/.+\.png$/.test(thumbUrl) ? thumbUrl : undefined;

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('✅  Account added')
        .addFields(
          { name: 'Riot ID', value: `${gameName}#${tagLine}`, inline: true },
          { name: 'Region', value: region.toUpperCase(), inline: true },
          { name: 'Rank', value: rank, inline: true }
        )
        .setFooter({ text: `Summoner Level: ${summoner.summonerLevel}` })
        .setTimestamp();

      if (validUrl) embed.setThumbnail(validUrl);

      await pending.edit({ content: '', embeds: [embed] });
      await safeDeleteMessage(message);
    } catch (err) {
      logger.error(`AddAccount failed → ${err.stack || err}`);
      await safeDeleteMessage(pending);
      await safeDeleteMessage(message);
      await message.reply(mapRiotError(err));
    }
  },
};

function mapRiotError(err) {
  if (!err?.response?.status) return '❌  Unexpected error – please try again later.';
  return err.response.status === 404
    ? '❌  Summoner not found. Check spelling and region.'
    : err.response.status === 403
      ? '❌  Riot API key invalid or expired.'
      : `❌  Riot API error (status ${err.response.status}).`;
}
