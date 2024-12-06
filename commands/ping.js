const { EmbedBuilder } = require('discord.js');
const { isApiKeyValid } = require('../utils/riotApi');

module.exports = {
  data: {
    name: 'ping',
    description: 'Test command to check if the bot and Riot API key are working',
  },
  /**
   * Execute the ping command.
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
  async execute(message, args, client) {
    // Send initial response
    const sentMessage = await message.reply('⏱ Pinging...');

    // Calculate round-trip latency
    const latency = sentMessage.createdTimestamp - message.createdTimestamp;

    // API (WebSocket) latency
    const apiLatency = Math.round(client.ws.ping);

    // Check Riot API key validity
    let riotApiStatus = 'Checking...';
    try {
      const validApiKey = await isApiKeyValid();
      riotApiStatus = validApiKey ? '✅ Valid' : '❌ Invalid/Expired';
    } catch (error) {
      riotApiStatus = '❗ Error checking key';
      console.error(`Error checking Riot API key: ${error.stack || error}`);
    }

    // Create an embed to display the results
    const embed = new EmbedBuilder()
      .setColor('#00FF7F') // A pleasant greenish color
      .setTitle('🏓 Pong!')
      .addFields(
        { name: 'Round-Trip Latency', value: `\`${latency}ms\``, inline: true },
        { name: 'API Latency', value: `\`${apiLatency}ms\``, inline: true },
        { name: 'Riot API Key', value: riotApiStatus, inline: false }
      )
      .setFooter({ text: 'Ping Check' })
      .setTimestamp();

    // Edit the initial message to display the embed
    await sentMessage.edit({ content: '', embeds: [embed] });
  },
};
