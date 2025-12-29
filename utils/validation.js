// utils/validation.js
// Input validation utilities

import { VALID_REGIONS, REGION_ALIASES } from './constants.js';

/**
 * Validate and normalize region input
 * @param {string} region - Raw region input
 * @returns {{ valid: boolean, region: string|null, error: string|null }}
 */
export function validateRegion(region) {
  if (!region || typeof region !== 'string') {
    return {
      valid: false,
      region: null,
      error: 'Region is required',
    };
  }

  const normalized = REGION_ALIASES[region.toLowerCase()] || region.toLowerCase();

  if (!VALID_REGIONS.includes(normalized)) {
    return {
      valid: false,
      region: null,
      error: `Invalid region. Valid regions: ${VALID_REGIONS.join(', ')}`,
    };
  }

  return { valid: true, region: normalized, error: null };
}

/**
 * Parse Riot ID (GameName#TagLine)
 * @param {string} riotId - Full Riot ID string
 * @returns {{ gameName: string|null, tagLine: string|null, error: string|null }}
 */
export function parseRiotId(riotId) {
  if (!riotId || typeof riotId !== 'string') {
    return {
      gameName: null,
      tagLine: null,
      error: 'Riot ID is required',
    };
  }

  const cleaned = riotId.replace(/\s+/g, '');
  const parts = cleaned.split('#');

  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return {
      gameName: null,
      tagLine: null,
      error: 'Invalid Riot ID format. Use: GameName#TagLine',
    };
  }

  return {
    gameName: parts[0],
    tagLine: parts[1],
    error: null,
  };
}

/**
 * Validate Discord permissions
 * @param {import('discord.js').GuildMember} member - Discord guild member
 * @param {bigint|string} permission - Permission flag (e.g., PermissionsBitField.Flags.Administrator)
 * @returns {{ hasPermission: boolean, error: string|null }}
 */
export function validatePermission(member, permission) {
  if (!member || !member.permissions) {
    return {
      hasPermission: false,
      error: 'Unable to verify permissions',
    };
  }

  if (!member.permissions.has(permission)) {
    const permName = typeof permission === 'string' ? permission : 'required permission';
    return {
      hasPermission: false,
      error: `You need **${permName}** permission to use this command.`,
    };
  }

  return { hasPermission: true, error: null };
}

/**
 * Validate integer within range
 * @param {number} value - Value to validate
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (inclusive)
 * @returns {{ valid: boolean, error: string|null }}
 */
export function validateIntRange(value, min, max) {
  if (typeof value !== 'number' || isNaN(value)) {
    return {
      valid: false,
      error: 'Value must be a number',
    };
  }

  if (!Number.isInteger(value)) {
    return {
      valid: false,
      error: 'Value must be an integer',
    };
  }

  if (value < min || value > max) {
    return {
      valid: false,
      error: `Value must be between ${min} and ${max}`,
    };
  }

  return { valid: true, error: null };
}

/**
 * Validate string is not empty
 * @param {string} value - String to validate
 * @param {string} fieldName - Field name for error message
 * @returns {{ valid: boolean, error: string|null }}
 */
export function validateNonEmpty(value, fieldName = 'Value') {
  if (!value || typeof value !== 'string' || value.trim().length === 0) {
    return {
      valid: false,
      error: `${fieldName} cannot be empty`,
    };
  }

  return { valid: true, error: null };
}
