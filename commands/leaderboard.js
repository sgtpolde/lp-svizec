// commands/leaderboard.js

const Account = require('../models/Account');
const GuildSettings = require('../models/GuildSettings');
const { EmbedBuilder } = require('discord.js');
const { TIER_EMOJIS } = require('../utils/constants');
const { capitalizeFirst } = require('../utils/helpers');
const logger = require('../utils/logger').childLogger('commands/leaderboard');

const MAX_ENTRIES = 50; // Discord embed desc cap ≈ 4k chars

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

    const rankings = buildSortedRankings(accounts).slice(0, MAX_ENTRIES);
    const embed = makeEmbed(rankings);

    // ─── Scheduled run (message == null) – broadcast if changed ────────────
    if (!message) {
      const embed = makeEmbed(rankings);
      const hash = embed.data.description; // simple content hash

      const settings = await GuildSettings.find();
      for (const { guildId, channelId } of settings) {
        try {
          if (lastSent.get(channelId) === hash) continue; // identical → skip

          const chan = await client.channels.fetch(channelId);
          if (chan?.isTextBased()) {
            await chan.send({ embeds: [embed] });
            lastSent.set(channelId, hash); // cache new hash
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
function buildSortedRankings(accs) {
  return accs
    .map(a => {
      const last = a.lpHistory?.at(-1);
      const [tier = 'UNRANKED', div = ''] = last?.rank?.split(' ') ?? [];
      return {
        name: `${a.gameName}#${a.tagLine}`,
        region: a.region.toUpperCase(),
        tier: tier.toUpperCase(),
        div,
        lp: last?.lp ?? 0,
      };
    })
    .sort((x, y) => rankScore(y) - rankScore(x));
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
  const desc = rankings
    .map((r, i) => {
      const emoji = TIER_EMOJIS[r.tier] ?? TIER_EMOJIS.UNRANKED;
      const rankTxt =
        r.tier === 'UNRANKED'
          ? 'Unranked'
          : `${capitalizeFirst(r.tier.toLowerCase())} ${r.div} (${r.lp} LP)`;
      return `**${i + 1}. ${r.name} (${r.region})** — ${emoji} ${rankTxt}`;
    })
    .join('\n');

  return new EmbedBuilder()
    .setColor(0xffd700)
    .setTitle('🏆 Leaderboard')
    .setDescription(desc || 'No data')
    .setFooter({ text: `Total tracked accounts: ${rankings.length}` })
    .setTimestamp();
}
