import logger from '../utils/logger.js';
import { scheduleTask } from '../services/scheduler.js';

const childLogger = logger.child({ label: 'events/clientReady' });

const CRON_STATS = '*/3 * * * *';
const CRON_LEADERBOARD = '0 */4 * * *';

export default {
  name: 'clientReady',
  once: true,

  /**
   * @param {import('discord.js').Client} client
   */
  execute(client) {
    childLogger.info(`🤖 Logged in as ${client.user.tag}`);

    scheduleTask('stats', CRON_STATS, async () => {
      const statsCmd = client.commands.get('stats');
      if (statsCmd) {
        await statsCmd.execute(null, client);
      }
    });

    scheduleTask('leaderboard', CRON_LEADERBOARD, async () => {
      const lbCmd = client.commands.get('leaderboard');
      if (lbCmd) {
        await lbCmd.execute(null, client);
      }
    });
  },
};
