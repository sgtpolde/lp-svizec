// events/ready.js
const cron = require('node-cron');
const logger = require('../utils/logger');

module.exports = {
  name: 'ready',
  once: true,
  /**
   * Event handler for client "ready" event.
   * @param {Client} client
   */
  execute(client) {
    logger.info(`Logged in as ${client.user.tag}`);

    // Schedule a task to run every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      try {
        const statsCommand = client.commands.get('stats');
        if (!statsCommand) {
          logger.warn('Stats command not found for scheduled task.');
          return;
        }

        await statsCommand.execute(null, null, client);
        logger.info('Scheduled stats command executed successfully.');
      } catch (error) {
        logger.error(`Error executing scheduled stats command: ${error.message}`);
      }
    });
  },
};
