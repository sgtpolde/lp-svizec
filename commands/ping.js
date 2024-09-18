module.exports = {
  data: {
    name: 'ping',
    description: 'Test command to check if the bot is working',
  },
  async execute(message, args, client) {
    message.reply('Pong!');
  },
};
