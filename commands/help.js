// commands/help.js

const { EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger').child({ label: 'commands/help' });

const EMBED_COLOUR = 0x00ff7f;
const DESC_LIMIT = 4096; // Discord embed description limit

module.exports = {
  data: {
    name: 'help',
    description: 'List all available commands',
  },
  cooldown: 5,

  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} _args
   * @param {import('discord.js').Client} client
   */
  async execute(message, _args, client) {
    const PREFIX = process.env.COMMAND_PREFIX || '!';

    const commands = [...client.commands.values()].sort((a, b) =>
      a.data.name.localeCompare(b.data.name)
    );

    if (!commands.length) {
      await message.reply('I have no commands available at the moment.');
      return;
    }

    // Build bullet list lines
    const lines = commands.map(c => `• \`${PREFIX}${c.data.name}\` — ${c.data.description}`);

    // Chunk lines to respect DESC_LIMIT
    const embeds = [];
    let buffer = '';
    let page = 1;

    for (const line of lines) {
      if (buffer.length + line.length + 1 > DESC_LIMIT) {
        embeds.push(makeEmbed(buffer, PREFIX, page++));
        buffer = '';
      }
      buffer += line + '\n';
    }
    embeds.push(makeEmbed(buffer, PREFIX, page));

    for (const embed of embeds) await message.reply({ embeds: [embed] });
    logger.debug(`Sent help (${commands.length} commands) to ${message.author.tag}`);
  },
};

function makeEmbed(text, prefix, page) {
  return new EmbedBuilder()
    .setColor(EMBED_COLOUR)
    .setTitle(`Available Commands${page > 1 ? ` – Page ${page}` : ''}`)
    .setDescription(text)
    .setFooter({ text: `Prefix: ${prefix}` })
    .setTimestamp();
}
