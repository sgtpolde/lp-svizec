// commands/leaderboard.js
const Account = require('../models/Account');
const { 
  EmbedBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ActionRowBuilder, 
  ComponentType 
} = require('discord.js');
const logger = require('../utils/logger');

const tierEmojis = {
  IRON: '⚙️',
  BRONZE: '🥉',
  SILVER: '🥈',
  GOLD: '🥇',
  PLATINUM: '💎',
  EMERALD: '🍀',
  DIAMOND: '🔷',
  MASTER: '🔮',
  GRANDMASTER: '🔥',
  CHALLENGER: '🏆',
  UNRANKED: '❔',
};

const ENTRIES_PER_PAGE = 20;

module.exports = {
  data: {
    name: 'leaderboard',
    description: 'Display the leaderboard of tracked accounts',
  },
  async execute(message, args) {
    try {
      const accounts = await Account.find();

      if (accounts.length === 0) {
        return message.reply('No accounts are being tracked yet.');
      }

      const rankings = getSortedRankings(accounts);

      // Calculate total pages
      const totalPages = Math.ceil(rankings.length / ENTRIES_PER_PAGE);
      let currentPage = 1;

      // Create initial embed and components
      const embed = buildLeaderboardEmbed(rankings, currentPage, totalPages);
      const row = buildActionRow(currentPage, totalPages);

      const sentMessage = await message.channel.send({ embeds: [embed], components: [row] });

      const collector = sentMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60_000,
      });

      collector.on('collect', async (interaction) => {
        if (interaction.user.id !== message.author.id) {
          return interaction.reply({ content: 'You cannot control this leaderboard.', ephemeral: true });
        }

        if (interaction.customId === 'prev_page' && currentPage > 1) {
          currentPage--;
        } else if (interaction.customId === 'next_page' && currentPage < totalPages) {
          currentPage++;
        }

        const updatedEmbed = buildLeaderboardEmbed(rankings, currentPage, totalPages);
        const updatedRow = buildActionRow(currentPage, totalPages);

        await interaction.update({ embeds: [updatedEmbed], components: [updatedRow] });
      });

      collector.on('end', async () => {
        const disabledRow = buildActionRow(currentPage, totalPages, true);
        await sentMessage.edit({ components: [disabledRow] });
      });
    } catch (error) {
      logger.error(`Error generating leaderboard: ${error.stack || error}`);
      await message.reply('❌ An error occurred while generating the leaderboard.');
    }
  },
};

function getSortedRankings(accounts) {
  const rankings = accounts.map((account) => {
    const { gameName, tagLine, region, lpHistory } = account;
    const latestLPRecord =
      lpHistory && lpHistory.length > 0 ? lpHistory[lpHistory.length - 1] : null;

    const summonerName = `${gameName}#${tagLine}`;
    const upperRegion = region.toUpperCase();

    if (latestLPRecord) {
      const [tier, division = ''] = latestLPRecord.rank
        ? latestLPRecord.rank.split(' ')
        : ['Unranked', ''];
      return {
        summonerName,
        region: upperRegion,
        tier: tier || 'Unranked',
        rank: division,
        leaguePoints: latestLPRecord.lp,
      };
    }

    return {
      summonerName,
      region: upperRegion,
      tier: 'Unranked',
      rank: '',
      leaguePoints: 0,
    };
  });

  rankings.sort((a, b) => {
    const rankScoreA = getRankScore(a.tier, a.rank, a.leaguePoints);
    const rankScoreB = getRankScore(b.tier, b.rank, b.leaguePoints);
    return rankScoreB - rankScoreA;
  });

  return rankings;
}

function buildLeaderboardEmbed(rankings, page, totalPages) {
  const startIndex = (page - 1) * ENTRIES_PER_PAGE;
  const endIndex = startIndex + ENTRIES_PER_PAGE;
  const pageRankings = rankings.slice(startIndex, endIndex);

  const description = pageRankings
    .map((acc, index) => {
      const position = startIndex + index + 1;
      const tierEmoji = tierEmojis[acc.tier.toUpperCase()] || tierEmojis.UNRANKED;
      const displayRank =
        acc.tier !== 'Unranked'
          ? `${capitalizeFirstLetter(acc.tier.toLowerCase())} ${acc.rank} (${acc.leaguePoints} LP)`
          : 'Unranked';

      return `**${position}. ${acc.summonerName} (${acc.region})** - ${tierEmoji} ${displayRank}`;
    })
    .join('\n');

  return new EmbedBuilder()
    .setTitle(`🏆 Leaderboard (Page ${page}/${totalPages})`)
    .setColor('#FFD700')
    .setDescription(description || 'No players found on this page.')
    .setFooter({ text: `Total tracked accounts: ${rankings.length}` })
    .setTimestamp();
}

function buildActionRow(page, totalPages, disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('prev_page')
      .setLabel('Previous')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled || page === 1),
    new ButtonBuilder()
      .setCustomId('next_page')
      .setLabel('Next')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled || page === totalPages)
  );
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function getRankScore(tier, division, leaguePoints) {
  // Insert Emerald between Platinum and Diamond
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

  const divisions = { I: 4, II: 3, III: 2, IV: 1 };

  let tierValue = tiers.indexOf(tier.toUpperCase());
  if (tierValue === -1) tierValue = -1;

  let divisionValue = 0;
  // IRON to EMERALD have divisions
  // DIAMOND also have divisions (up to the code)
  // MASTER, GRANDMASTER, CHALLENGER have no divisions (fixed value)
  if (tierValue >= 0 && tierValue <= 6) {
    divisionValue = divisions[division] || 0;
  } else if (tierValue >= 7) {
    // MASTER(7), GRANDMASTER(8), CHALLENGER(9) have a fixed division value
    divisionValue = 5;
  }

  const lpValue = leaguePoints / 1000;
  return tierValue * 100 + divisionValue * 10 + lpValue;
}
