// commands/help.js
const { EmbedBuilder } = require('discord.js');

module.exports = {
  data: {
    name: 'help',
    description: 'List all available commands',
  },
  cooldown: 5,
  /**
   * Execute the help command.
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
  async execute(message, args, client) {
    const COMMAND_PREFIX = process.env.COMMAND_PREFIX || '!';

    // Extract commands and sort them alphabetically by name
    const commands = Array.from(client.commands.values()).sort((a, b) =>
      a.data.name.localeCompare(b.data.name)
    );

    if (commands.length === 0) {
      return message.reply('I have no commands available at the moment.');
    }

    // Map commands into a formatted string
    const commandList = commands
      .map((cmd) => `**${COMMAND_PREFIX}${cmd.data.name}** - ${cmd.data.description}`)
      .join('\n');

    // Create an embed for a cleaner look
    const helpEmbed = new EmbedBuilder()
      .setColor('#00FF7F')
      .setTitle('Available Commands')
      .setDescription(`Below is a list of my commands with their descriptions. Use \`${COMMAND_PREFIX}\` followed by the command name to run a command.`)
      .addFields({ name: 'Commands', value: commandList })
      .setFooter({ text: `Prefix: ${COMMAND_PREFIX}` })
      .setTimestamp();

    await message.reply({ embeds: [helpEmbed] });
  },
};
