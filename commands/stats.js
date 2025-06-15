// commands/stats.js

const Account = require('../models/Account');
const GuildSettings = require('../models/GuildSettings');
const { EmbedBuilder } = require('discord.js');
const {
  getMatchHistory,
  getMatchDetails,
  getRankedStats,
  isApiKeyValid,
} = require('../utils/riotApi');
const { getDDragonVersion } = require('../utils/ddragon');
const { createProgressBar, capitalizeFirst } = require('../utils/helpers');
const logger = require('../utils/logger').child({ label: 'commands/stats' });

const QUEUE_SOLO = 420;
const MAX_HISTORY = 200;

module.exports = {
  data: {
    name: 'stats',
    description: 'Fetch and broadcast latest ranked stats for all tracked accounts',
  },

  /**
   * @param {import('discord.js').Message | null} message
   * @param {string[] | null} _args
   * @param {import('discord.js').Client} client
   */
  async execute(message, _args, client) {
    // 1. API key sanity check
    if (!(await isApiKeyValid())) {
      const msg = 'Riot API key invalid / expired – stats aborted.';
      logger.error(msg);
      if (message) await message.reply(`❌  ${msg}`);
      return;
    }

    // 2. Pre‑fetch guild → channel map once
    const settings = await GuildSettings.find();
    const guildChannel = new Map(settings.map(s => [s.guildId, s.channelId]));

    // 3. Iterate accounts serially (parallel risks rate‑limit)
    const accounts = await Account.find();
    for (const acc of accounts) {
      await processAccount(acc, guildChannel, client);
    }

    if (message) await message.reply('✅  Stats update complete.');
  },
};

// -----------------------------------------------------------------------------
// Account worker
// -----------------------------------------------------------------------------
async function processAccount(acc, guildChannel, client) {
  const { region, puuid, summonerId, gameName, tagLine } = acc;
  const lastRecord = acc.lpHistory?.at(-1) ?? null;
  let lastLP = lastRecord?.lp ?? null;
  let lastRank = lastRecord?.rank ?? 'Unranked';

  // Fetch latest 20 ranked match IDs
  const matches = await getMatchHistory(puuid, region, 'ranked');
  const newIds = [];
  for (const id of matches) {
    if (id === acc.lastMatchId) break;
    newIds.push(id);
  }
  if (!newIds.length) return; // nothing new

  acc.lastMatchId = newIds[0]; // newest ID becomes checkpoint

  // Process each new match oldest → newest
  for (const matchId of newIds.reverse()) {
    const details = await getMatchDetails(matchId, region);
    if (details.info.queueId !== QUEUE_SOLO) continue; // only soloQ

    const part = details.info.participants.find(p => p.puuid === puuid);
    if (!part) continue;

    // Current ranked stats
    const ranked = await getRankedStats(summonerId, region);
    const solo = ranked.find(q => q.queueType === 'RANKED_SOLO_5x5');

    const { currentLP, currentRank, totalWins, totalLosses, winPercentage } = parseSoloStats(solo);

    const lpChange = calcLPChange(lastLP, lastRank, currentLP, currentRank);
    const lpText = lpChangeToText(lpChange);

    const cs = part.totalMinionsKilled + part.neutralMinionsKilled;
    const csPerMin = (cs / (details.info.gameDuration / 60)).toFixed(1);
    const kp = (
      ((part.kills + part.assists) /
        details.info.teams.find(t => t.teamId === part.teamId).objectives.champion.kills) *
      100
    ).toFixed(1);

    //const bar = createProgressBar(csPerMin, 10, 10);

    const embed = new EmbedBuilder()
      .setColor(part.win ? 0x57f287 : 0xed4245)
      .setTitle(`${gameName}#${tagLine} – ${part.win ? 'Victory' : 'Defeat'}`)
      .setDescription(
        `**Rank:** ${currentRank} (${currentLP} LP)\n**LP Change:** ${lpText}\n` +
          `**Win rate:** (${totalWins}-${totalLosses}) | ${winPercentage}%`
      )
      .addFields(
        { name: 'Champion', value: part.championName, inline: true },
        { name: 'KDA', value: `⚔️  ${part.kills}/${part.deaths}/${part.assists}`, inline: true },
        { name: 'Kill Participation', value: `${kp}%`, inline: true },
        { name: 'CS/ Min', value: `📈  ${csPerMin}`, inline: true },
        { name: 'Vision Score', value: `👁️  ${part.visionScore}`, inline: true }
      )
      .setThumbnail(
        `https://ddragon.leagueoflegends.com/cdn/${getDDragonVersion()}/img/champion/${part.championName}.png`
      )
      .setFooter({ text: `Game Duration: ${formatDuration(details.info.gameDuration)}` })
      .setTimestamp();

    // Broadcast to every guild channel configured
    for (const [gid, cid] of guildChannel) {
      try {
        const guild = await client.guilds.fetch(gid);
        const channel = await guild.channels.fetch(cid);
        if (channel) await channel.send({ embeds: [embed] });
      } catch (err) {
        logger.warn(`Broadcast to ${gid}/${cid} failed: ${err.message}`);
      }
    }

    // Record LP history
    acc.addLPRecord({ lp: currentLP, matchId, lpChange, rank: currentRank }, MAX_HISTORY);
    lastLP = currentLP;
    lastRank = currentRank;
  }

  await acc.save();
}

// -----------------------------------------------------------------------------
// helpers specific to this command
// -----------------------------------------------------------------------------
function parseSoloStats(solo) {
  if (!solo)
    return {
      currentLP: 0,
      currentRank: 'Unranked',
      totalWins: 0,
      totalLosses: 0,
      winPercentage: 0,
    };
  const totalGames = solo.wins + solo.losses;
  return {
    currentLP: solo.leaguePoints,
    currentRank: `${capitalizeFirst(solo.tier.toLowerCase())} ${solo.rank}`,
    totalWins: solo.wins,
    totalLosses: solo.losses,
    winPercentage: totalGames ? ((solo.wins / totalGames) * 100).toFixed(2) : 0,
  };
}

function calcLPChange(lastLP, lastRank, currentLP, currentRank) {
  if (lastLP === null) return null;
  const lastVal = rankToValue(lastRank);
  const curVal = rankToValue(currentRank);
  if (curVal > lastVal) return 100 - lastLP + currentLP;
  if (curVal < lastVal) return -lastLP - (100 - currentLP);
  return currentLP - lastLP;
}

function lpChangeToText(lp) {
  if (lp === null) return 'N/A';
  const emoji = lp > 0 ? '🔼' : lp < 0 ? '🔽' : '⏺️';
  return `${emoji} ${lp > 0 ? '+' : ''}${lp} LP`;
}

function formatDuration(sec) {
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

const tierVal = {
  Iron: 0,
  Bronze: 1,
  Silver: 2,
  Gold: 3,
  Platinum: 4,
  Emerald: 5,
  Diamond: 6,
  Master: 7,
  Grandmaster: 8,
  Challenger: 9,
  Unranked: -1,
};
const divVal = { IV: 0, III: 1, II: 2, I: 3, '': 4 };
function rankToValue(rankStr) {
  if (rankStr === 'Unranked') return -1;
  const [tier, div] = rankStr.split(' ');
  return tierVal[capitalizeFirst(tier)] * 4 + divVal[div];
}
