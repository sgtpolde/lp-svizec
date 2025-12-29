// utils/errorHandler.js
// Centralized error handling utilities

import logger from './logger.js';

/**
 * Handle Riot API errors with user-friendly messages
 * @param {Error} error - Error object from Riot API
 * @returns {string} User-friendly error message
 */
export function handleRiotApiError(error) {
  if (!error?.response?.status) {
    return '❌ Unexpected error – please try again later.';
  }

  const statusMessages = {
    400: '❌ Invalid request. Please check your input.',
    401: '❌ Riot API authentication failed.',
    403: '❌ Riot API key invalid or expired.',
    404: '❌ Summoner not found. Check spelling and region.',
    429: '❌ Rate limit exceeded. Please try again later.',
    500: '❌ Riot API server error. Please try again later.',
    503: '❌ Riot API temporarily unavailable.',
  };

  return (
    statusMessages[error.response.status] || `❌ Riot API error (status ${error.response.status}).`
  );
}

/**
 * Handle Discord interaction errors gracefully
 * @param {Error} error - Error object
 * @param {import('discord.js').ChatInputCommandInteraction} interaction - Discord interaction
 * @param {import('winston').Logger} commandLogger - Winston logger instance
 */
export async function handleInteractionError(error, interaction, commandLogger) {
  commandLogger.error(`Interaction error: ${error.stack || error}`);

  const errorMessage = '❌ An unexpected error occurred. Please try again later.';

  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(errorMessage);
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  } catch (replyError) {
    commandLogger.error(`Failed to send error message: ${replyError.message}`);
  }
}

/**
 * Validate required environment variables
 * @param {string[]} requiredVars - Array of required env var names
 * @throws {Error} If any required var is missing
 */
export function validateEnv(requiredVars) {
  const missing = requiredVars.filter(v => !process.env[v]);

  if (missing.length > 0) {
    const errorMsg = `Missing required environment variables: ${missing.join(', ')}`;
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }
}

/**
 * Safe error logging with stack trace
 * @param {Error|string} error - Error object or message
 * @param {import('winston').Logger} [customLogger] - Optional custom logger
 */
export function logError(error, customLogger = logger) {
  if (error instanceof Error) {
    customLogger.error(`${error.message}\n${error.stack}`);
  } else {
    customLogger.error(String(error));
  }
}

/**
 * Create a standardized error response for Discord
 * @param {string} message - Error message
 * @param {boolean} [ephemeral=true] - Whether to make the error ephemeral
 * @returns {object} Discord message options
 */
export function createErrorResponse(message, ephemeral = true) {
  return {
    content: message.startsWith('❌') ? message : `❌ ${message}`,
    ephemeral,
  };
}
