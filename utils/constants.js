// utils/constants.js
// -----------------------------------------------------------------------------
// Shared constants used across commands and services
// -----------------------------------------------------------------------------

// Canonical region keys accepted by the bot
export const VALID_REGIONS = [
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

// User‑friendly aliases that are mapped to canonical keys
export const REGION_ALIASES = {
  eune: 'eun', // treat "eune" same as "eun"
};

// Helpful emoji map (used by leaderboard etc.)
export const TIER_EMOJIS = {
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
