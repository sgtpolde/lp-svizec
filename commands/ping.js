// commands/ping.js

const { EmbedBuilder } = require('discord.js');
const { isApiKeyValid } = require('../utils/riotApi');
const logger = require('../utils/logger').child({ label: 'commands/ping' });

const EMBED_COLOUR = 0x00ff7f; // mint green
const EMOJI_OK = '✅';
const EMOJI_BAD = '❌';
const EMOJI_ERR = '❗';

module.exports = {
  data: {
    name: 'ping',
    description: 'Check round‑trip latency and Riot‑API key status',
  },

  /**
   * @param {import('discord.js').Message|null} message  Incoming Discord message (may be null if run via cron)
   * @param {string[]|null} args
   * @param {import('discord.js').Client} client
   */
  async execute(message, args, client) {
    const timer = message ? `ping-${message.id}` : `ping-cron-${Date.now()}`;
    logger.time(timer);

    // If called without a Discord message (e.g. via a scheduler) just log stats
    if (!message) {
      const apiLatency = Math.round(client.ws.ping);
      const apiKeyValid = await safeApiKeyCheck();
      logger.info(`Ping (no message) → API latency: ${apiLatency}ms | key: ${apiKeyValid}`);
      logger.timeEnd(timer);
      return;
    }

    // Step 1: send placeholder to measure round‑trip
    const placeholder = await message.reply('⏱ Pinging…');
    const roundTrip = placeholder.createdTimestamp - message.createdTimestamp;
    const apiLatency = Math.round(client.ws.ping);

    // Step 2: Riot API key validation
    const apiKeyValid = await safeApiKeyCheck();

    // Step 3: embed response
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOUR)
      .setTitle('🏓 Pong!')
      .addFields(
        { name: 'Round‑Trip', value: `\`${roundTrip} ms\``, inline: true },
        { name: 'Gateway Ping', value: `\`${apiLatency} ms\``, inline: true },
        {
          name: 'Riot API Key',
          value:
            apiKeyValid === true
              ? `${EMOJI_OK} Valid`
              : apiKeyValid === false
                ? `${EMOJI_BAD} Invalid`
                : `${EMOJI_ERR} Error`,
          inline: false,
        }
      )
      .setFooter({ text: 'Ping Check' })
      .setTimestamp();

    await placeholder.edit({ content: '', embeds: [embed] });
    logger.timeEnd(timer, `to ${message.author.tag}`);
  },
};

// ---------------------------------------------------------------------------
// helper – wrap isApiKeyValid with safe error logging
// ---------------------------------------------------------------------------
async function safeApiKeyCheck() {
  try {
    return await isApiKeyValid(); // boolean
  } catch (err) {
    logger.error(`Riot API key check failed → ${err.stack || err}`);
    return null; // signify error
  }
}
