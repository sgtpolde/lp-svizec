// events/ready.js
const cron = require('node-cron');
const logger = require('../utils/logger');

module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    logger.info(`Logged in as ${client.user.tag}`);

    // Schedule a task to fetch updates every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      try {
        const statsCommand = client.commands.get('stats');
        await statsCommand.execute(null, null, client);
        logger.info('Scheduled stats command executed successfully.');
      } catch (error) {
        logger.error(
          `Error executing scheduled stats command: ${error.message}`
        );
      }
    });
  },
};
