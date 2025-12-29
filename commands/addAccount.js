// commands/addAccount.js
import Account from '../models/Account.js';
import { getPUUIDByRiotID, getSummonerByPUUID, getRankedStats } from '../utils/riotApi.js';
import { getDDragonVersion } from '../utils/ddragon.js';
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { VALID_REGIONS, REGION_ALIASES } from '../utils/constants.js';
import { capitalizeFirst } from '../utils/helpers.js';
import logger from '../utils/logger.js';

const childLogger = logger.child({ label: 'commands/addAccount' });

export default {
  data: new SlashCommandBuilder()
    .setName('addaccount')
    .setDescription('Add a League of Legends account to track')
    .addStringOption(option =>
      option
        .setName('gamename')
        .setDescription('The summoner game name (without tag)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('tagline')
        .setDescription('The summoner tag line (without #)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('region')
        .setDescription('The server region')
        .setRequired(true)
        .addChoices(...VALID_REGIONS.map(r => ({ name: r.toUpperCase(), value: r })))
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    await interaction.deferReply();

    const gameName = interaction.options.getString('gamename');
    const tagLine = interaction.options.getString('tagline');
    const rawRegion = interaction.options.getString('region');
    const region = REGION_ALIASES[rawRegion.toLowerCase()] || rawRegion.toLowerCase();

    try {
      const { puuid } = await getPUUIDByRiotID(gameName, tagLine);
      const summoner = await getSummonerByPUUID(puuid, region);

      if (await Account.findOne({ discordId: interaction.user.id, puuid, region })) {
        await interaction.editReply('⚠️  You already track that account.');
        return;
      }

      const ranked = await getRankedStats(puuid, region);
      const solo = ranked.find(q => q.queueType === 'RANKED_SOLO_5x5');

      const account = new Account({
        discordId: interaction.user.id,
        gameName,
        tagLine,
        region,
        puuid,
      });

      let rank = 'Unranked';
      if (solo) {
        rank = `${capitalizeFirst(solo.tier.toLowerCase())} ${solo.rank}`;
        account.addLPRecord({ lp: solo.leaguePoints, rank });
      }
      await account.save();

      const ddragonVer = getDDragonVersion();
      const iconId = summoner.profileIconId || 0;
      const thumbUrl = `https://ddragon.leagueoflegends.com/cdn/${ddragonVer}/img/profileicon/${iconId}.png`;
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

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      childLogger.error(`AddAccount failed → ${err.stack || err}`);
      await interaction.editReply({ content: mapRiotError(err) });
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
