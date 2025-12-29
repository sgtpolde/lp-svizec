// commands/ping.js

import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { isApiKeyValid } from '../utils/riotApi.js';
import logger from '../utils/logger.js';

const childLogger = logger.child({ label: 'commands/ping' });

const EMBED_COLOUR = 0x00ff7f; // mint green
const EMOJI_OK = '✅';
const EMOJI_BAD = '❌';
const EMOJI_ERR = '❗';

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check round-trip latency and Riot API key status'),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction|null} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const timer = interaction ? `ping-${interaction.id}` : `ping-cron-${Date.now()}`;
    childLogger.time(timer);

    // If called without a Discord interaction (e.g. via a scheduler) just log stats
    if (!interaction) {
      const apiLatency = Math.round(client.ws.ping);
      const apiKeyValid = await safeApiKeyCheck();
      childLogger.info(
        `Ping (no interaction) → API latency: ${apiLatency}ms | key: ${apiKeyValid}`
      );
      childLogger.timeEnd(timer);
      return;
    }

    // Step 1: defer to get timestamp
    await interaction.deferReply();
    const roundTrip = Date.now() - interaction.createdTimestamp;
    const apiLatency = Math.round(client.ws.ping);

    // Step 2: Riot API key validation
    const apiKeyValid = await safeApiKeyCheck();

    // Step 3: embed response
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOUR)
      .setTitle('🏓 Pong!')
      .addFields(
        { name: 'Round-Trip', value: `\`${roundTrip} ms\``, inline: true },
        { name: 'Gateway Ping', value: `\`${apiLatency} ms\``, inline: true },
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

    await interaction.editReply({ embeds: [embed] });
    childLogger.timeEnd(timer, `to ${interaction.user.tag}`);
  },
};

// ---------------------------------------------------------------------------
// helper – wrap isApiKeyValid with safe error logging
// ---------------------------------------------------------------------------
async function safeApiKeyCheck() {
  try {
    return await isApiKeyValid(); // boolean
  } catch (err) {
    childLogger.error(`Riot API key check failed → ${err.stack || err}`);
    return null; // signify error
  }
}
