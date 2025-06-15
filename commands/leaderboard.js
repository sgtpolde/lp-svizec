// commands/leaderboard.js
const Account = require('../models/Account');
const GuildSettings = require('../models/GuildSettings');
const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ComponentType,
} = require('discord.js');
const { TIER_EMOJIS } = require('../utils/constants');
const { capitalizeFirst } = require('../utils/helpers');
const logger = require('../utils/logger').child({ label: 'commands/leaderboard' });

const ENTRIES = 20;
const IDLE = 120_000; // 2 min

module.exports = {
  data: {
    name: 'leaderboard',
    description: 'Show tracked‑account leaderboard',
  },

  /**
   * @param {import('discord.js').Message | null} message
   * @param {string[] | null} _args
   * @param {import('discord.js').Client} client
   */
  async execute(message, _args, client) {
    const accounts = await Account.find();
    if (!accounts.length) {
      if (message) await message.reply('No accounts are being tracked yet.');
      return;
    }

    const rankings = buildSortedRankings(accounts);
    const pages = Math.ceil(rankings.length / ENTRIES);

    // ─── Scheduled run (message == null) → broadcast single embed to every guild
    if (!message) {
      const embed = makeEmbed(rankings, 1, pages);
      const settings = await GuildSettings.find();
      for (const { guildId, channelId } of settings) {
        try {
          const chan = await client.channels.fetch(channelId);
          if (chan?.isTextBased()) await chan.send({ embeds: [embed] });
        } catch (e) {
          logger.warn(`Broadcast to ${guildId}/${channelId} failed – ${e.message}`);
        }
      }
      return;
    }

    // ─── Manual run (interactive pagination) ──────────────────────────────
    let page = 1;
    const sent = await message.channel.send({
      embeds: [makeEmbed(rankings, page, pages)],
      components: [makeRow(page, pages)],
    });

    const collector = sent.createMessageComponentCollector({
      componentType: ComponentType.Button,
      idle: IDLE,
    });

    collector.on('collect', async int => {
      if (int.user.id !== message.author.id) {
        await int.reply({ content: 'Only the command author can flip pages.', ephemeral: true });
        return;
      }
      page += int.customId === 'next' ? 1 : -1;
      page = Math.max(1, Math.min(page, pages));
      await int.update({
        embeds: [makeEmbed(rankings, page, pages)],
        components: [makeRow(page, pages)],
      });
    });

    collector.on('end', async () => {
      try {
        await sent.edit({ components: [makeRow(page, pages, true)] });
      } catch {/* msg deleted */}
    });
  },
};

// ---------------- helpers ---------------------------------------------------
function buildSortedRankings(accs) {
  return accs
    .map(a => {
      const last = a.lpHistory?.at(-1);
      const [tier = 'UNRANKED', div = ''] = last?.rank?.split(' ') ?? [];
      return {
        name: `${a.gameName}#${a.tagLine}`,
        region: a.region.toUpperCase(),
        tier,
        div,
        lp: last?.lp ?? 0,
      };
    })
    .sort((x, y) => rankScore(y) - rankScore(x));
}

function rankScore({ tier, div, lp }) {
  const tiers = [
    'IRON','BRONZE','SILVER','GOLD','PLATINUM','EMERALD','DIAMOND','MASTER','GRANDMASTER','CHALLENGER',
  ];
  const divVal = { IV: 1, III: 2, II: 3, I: 4, '': 5 };
  const idx = tiers.indexOf(tier.toUpperCase());
  return (idx + 1) * 1_000_000 + (divVal[div] || 0) * 10_000 + lp;
}

function makeEmbed(rank, page, pages) {
  const start = (page - 1) * ENTRIES;
  const slice = rank.slice(start, start + ENTRIES);
  const desc = slice
    .map((r, i) => {
      const pos = start + i + 1;
      const emoji = TIER_EMOJIS[r.tier.toUpperCase()] ?? TIER_EMOJIS.UNRANKED;
      const rankTxt =
        r.tier === 'UNRANKED'
          ? 'Unranked'
          : `${capitalizeFirst(r.tier.toLowerCase())} ${r.div} (${r.lp} LP)`;
      return `**${pos}. ${r.name} (${r.region})** — ${emoji} ${rankTxt}`;
    })
    .join('\\n');
  return new EmbedBuilder()
    .setColor(0xffd700)
    .setTitle(`🏆 Leaderboard – Page ${page}/${pages}`)
    .setDescription(desc || 'No data')
    .setFooter({ text: `Total tracked accounts: ${rank.length}` })
    .setTimestamp();
}

function makeRow(p, pages, disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('prev')
      .setLabel('Previous')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled || p === 1),
    new ButtonBuilder()
      .setCustomId('next')
      .setLabel('Next')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled || p === pages),
  );
}
