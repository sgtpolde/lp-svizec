// utils/constants.js
// -----------------------------------------------------------------------------
// Shared constants used across commands and services
// -----------------------------------------------------------------------------

// Canonical region keys accepted by the bot
const VALID_REGIONS = ['na', 'euw', 'eun', 'kr', 'jp', 'oce', 'br', 'lan', 'las', 'ru', 'tr'];

// User‑friendly aliases that are mapped to canonical keys
const REGION_ALIASES = {
  eune: 'eun', // treat "eune" same as "eun"
};

// Helpful emoji map (used by leaderboard etc.)
const TIER_EMOJIS = {
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

module.exports = { VALID_REGIONS, REGION_ALIASES, TIER_EMOJIS };
