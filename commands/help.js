// commands/help.js
module.exports = {
  data: {
    name: 'help',
    description: 'List all available commands',
  },
  cooldown: 5,
  async execute(message, args, client) {
    const COMMAND_PREFIX = process.env.COMMAND_PREFIX || '!';
    const commandList = client.commands
      .map(
        (cmd) =>
          `\`${COMMAND_PREFIX}${cmd.data.name}\`: ${cmd.data.description}`
      )
      .join('\n');

    await message.reply(`Here are my available commands:\n${commandList}`);
  },
};
