// commands/help.js

import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import logger from '../utils/logger.js';

const childLogger = logger.child({ label: 'commands/help' });

const EMBED_COLOUR = 0x00ff7f;
const DESC_LIMIT = 4096; // Discord embed description limit

export default {
  data: new SlashCommandBuilder().setName('help').setDescription('List all available commands'),
  cooldown: 5,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const commands = [...client.commands.values()].sort((a, b) =>
      a.data.name.localeCompare(b.data.name)
    );

    if (!commands.length) {
      await interaction.reply('I have no commands available at the moment.');
      return;
    }

    // Build bullet list lines
    const lines = commands.map(c => `• \`/${c.data.name}\` — ${c.data.description}`);

    // Chunk lines to respect DESC_LIMIT
    const embeds = [];
    let buffer = '';
    let page = 1;

    for (const line of lines) {
      if (buffer.length + line.length + 1 > DESC_LIMIT) {
        embeds.push(makeEmbed(buffer, page++));
        buffer = '';
      }
      buffer += line + '\n';
    }
    embeds.push(makeEmbed(buffer, page));

    await interaction.reply({ embeds: [embeds[0]] });
    for (let i = 1; i < embeds.length; i++) {
      await interaction.followUp({ embeds: [embeds[i]] });
    }
    childLogger.debug(`Sent help (${commands.length} commands) to ${interaction.user.tag}`);
  },
};

function makeEmbed(text, page) {
  return new EmbedBuilder()
    .setColor(EMBED_COLOUR)
    .setTitle(`Available Commands${page > 1 ? ` – Page ${page}` : ''}`)
    .setDescription(text)
    .setFooter({ text: 'Use slash commands (/) to interact with the bot' })
    .setTimestamp();
}
