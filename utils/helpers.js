// utils/helpers.js
// -----------------------------------------------------------------------------
// Small reusable helpers (import what you need)
// -----------------------------------------------------------------------------

import logger from './logger.js';

/**
 * Delete a Discord message if possible (silently ignores failures).
 * @param {import('discord.js').Message | null | undefined} msg
 */
export async function safeDeleteMessage(msg) {
  if (msg && msg.deletable) {
    try {
      await msg.delete();
    } catch (err) {
      logger.debug(`safeDeleteMessage: ${err.message}`);
    }
  }
}

/** Capitalise just the first letter of a string. */
export const capitalizeFirst = (s = '') => (s.length ? s[0].toUpperCase() + s.slice(1) : '');

/**
 * Tiny text‑mode progress bar (used by stats command).
 * @param {number} value
 * @param {number} max
 * @param {number} len
 */
export function createProgressBar(value, max, len = 10) {
  const pct = Math.min(value / max, 1);
  const filled = Math.round(pct * len);
  return `\`${'█'.repeat(filled)}${'░'.repeat(len - filled)}\` ${Math.round(pct * 100)}%`;
}
