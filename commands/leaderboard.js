// commands/leaderboard.js

const Account = require('../models/Account');
const GuildSettings = require('../models/GuildSettings');
const { EmbedBuilder } = require('discord.js');
const { TIER_EMOJIS } = require('../utils/constants');
const { capitalizeFirst } = require('../utils/helpers');
const logger = require('../utils/logger').child({ label: 'commands/leaderboard' });
const { getRankedStats } = require('../utils/riotApi');

const MAX_ENTRIES = 50; // Discord embed desc cap ≈ 4k chars
const MIN_GAMES_FOR_QUALIFICATION = 100; // Mark as Disqualified if below this

module.exports = {
  data: {
    name: 'leaderboard',
    description: 'Show ranked leaderboard of tracked accounts',
  },

  /**
   * @param {import('discord.js').Message | null} message
   * @param {string[]|null} _args
   * @param {import('discord.js').Client} client
   */
  async execute(message, _args, client) {
    const accounts = await Account.find();
    if (!accounts.length) {
      if (message) await message.reply('No accounts are being tracked yet.');
      return;
    }

  const rankings = await buildSortedRankings(accounts);
  const embed = makeEmbed(rankings);

    // ─── Scheduled run (message == null) – broadcast every 4h ──────────────
    if (!message) {
      const settings = await GuildSettings.find();
      for (const { guildId, channelId } of settings) {
        try {
          const chan = await client.channels.fetch(channelId);
          if (chan?.isTextBased()) {
            await chan.send({ embeds: [embed] });
          }
        } catch (e) {
          logger.warn(`Broadcast to ${guildId}/${channelId} failed – ${e.message}`);
        }
      }
      return;
    }

    // manual invocation
    await message.channel.send({ embeds: [embed] });
  },
};

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
async function buildSortedRankings(accs) {
  const rankings = [];

  for (const a of accs) {
    const last = a.lpHistory?.at(-1);
    const [tier = 'UNRANKED', div = ''] = last?.rank?.split(' ') ?? [];

    let wins = 0,
      losses = 0,
      totalGamesPlayed = 0,
      winRate = 0;

    try {
      // Fetch current ranked stats to get wins/losses
      const rankedStats = await getRankedStats(a.puuid, a.region);
      const soloQueue = rankedStats.find(q => q.queueType === 'RANKED_SOLO_5x5');

      if (soloQueue) {
        wins = soloQueue.wins;
        losses = soloQueue.losses;
        totalGamesPlayed = wins + losses;
        winRate = totalGamesPlayed > 0 ? Math.round((wins / totalGamesPlayed) * 100) : 0;
      }
    } catch (error) {
      logger.warn(`Failed to fetch ranked stats for ${a.gameName}#${a.tagLine}: ${error.message}`);
    }

    rankings.push({
      name: `${a.gameName}#${a.tagLine}`,
      region: a.region.toUpperCase(),
      tier: tier.toUpperCase(),
      div,
      lp: last?.lp ?? 0,
      wins,
      losses,
      totalGamesPlayed,
      winRate,
    });
  }

  return rankings.sort((x, y) => rankScore(y) - rankScore(x));
}

function rankScore({ tier, div, lp }) {
  const tiers = [
    'IRON',
    'BRONZE',
    'SILVER',
    'GOLD',
    'PLATINUM',
    'EMERALD',
    'DIAMOND',
    'MASTER',
    'GRANDMASTER',
    'CHALLENGER',
  ];
  const divVal = { IV: 1, III: 2, II: 3, I: 4, '': 5 };
  const idx = tiers.indexOf(tier.toUpperCase());
  return (idx + 1) * 1_000_000 + (divVal[div] || 0) * 10_000 + lp;
}

function makeEmbed(rankings) {
  // Partition into Qualified and Disqualified
  const qualified = [];
  const disqualified = [];
  for (const r of rankings) {
    if (r.totalGamesPlayed >= MIN_GAMES_FOR_QUALIFICATION) qualified.push(r);
    else disqualified.push(r);
  }

  // Rankings are already sorted by rankScore; keep that for qualified.
  // For DQ bracket, sort by total games played (desc), then wins (desc) as tiebreaker.
  disqualified.sort((a, b) => {
    if (b.totalGamesPlayed !== a.totalGamesPlayed) return b.totalGamesPlayed - a.totalGamesPlayed;
    return b.wins - a.wins;
  });

  // Build lines with a cap of MAX_ENTRIES total
  const lines = [];
  if (qualified.length) {
    lines.push('**Qualified**');
    for (let i = 0; i < qualified.length && lines.length - 1 < MAX_ENTRIES; i++) {
      const r = qualified[i];
      const emoji = TIER_EMOJIS[r.tier] ?? TIER_EMOJIS.UNRANKED;
      const rankTxt =
        r.tier === 'UNRANKED'
          ? 'Unranked'
          : `${capitalizeFirst(r.tier.toLowerCase())} ${r.div} (${r.lp} LP)`;
      const gamesInfo =
        r.totalGamesPlayed > 0
          ? ` • ${r.totalGamesPlayed}G (${r.wins}W/${r.losses}L) ${r.winRate}%`
          : '';
      lines.push(`**${i + 1}. ${r.name} (${r.region})** — ${emoji} ${rankTxt}${gamesInfo}`);
    }
  }

  if (disqualified.length && lines.length < MAX_ENTRIES) {
    if (lines.length) lines.push('');
    lines.push(`**Disqualified (< ${MIN_GAMES_FOR_QUALIFICATION} games)**`);
    const startIdx = lines.length;
    let count = 0;
    for (let i = 0; i < disqualified.length && lines.length < MAX_ENTRIES + startIdx; i++) {
      const r = disqualified[i];
      const emoji = TIER_EMOJIS[r.tier] ?? TIER_EMOJIS.UNRANKED;
      const rankTxt =
        r.tier === 'UNRANKED'
          ? 'Unranked'
          : `${capitalizeFirst(r.tier.toLowerCase())} ${r.div} (${r.lp} LP)`;
      const gamesInfo =
        r.totalGamesPlayed > 0
          ? ` • ${r.totalGamesPlayed}G (${r.wins}W/${r.losses}L) ${r.winRate}%`
          : '';
      count++;
      lines.push(`• ${r.name} (${r.region}) — ${emoji} ${rankTxt}${gamesInfo}`);
    }
  }

  const desc = lines.join('\n');
  return new EmbedBuilder()
    .setColor(0xffd700)
    .setTitle('🏆 Leaderboard')
    .setDescription(desc || 'No data')
    .setFooter({ text: `Total tracked accounts: ${rankings.length}` })
    .setTimestamp();
}
