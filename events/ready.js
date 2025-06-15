// events/ready.js

const cron = require('node-cron');
const logger = require('../utils/logger').child({ label: 'events/ready' });

const CRON_STATS = '*/5 * * * *'; // every 5 minutes
const CRON_LEADERBOARD = '0 */2 * * *'; // at hh:00 every 2 hours

let statsTask = null;
let lbTask = null;

module.exports = {
  name: 'ready',
  once: true,

  /**
   * @param {import('discord.js').Client} client
   */
  execute(client) {
    logger.info(`🤖 Logged in as ${client.user.tag}`);

    // ─── Stats cron ────────────────────────────────────────────
    if (statsTask) {
      logger.warn('Stats cron already initialised – skipping duplicate schedule');
    } else {
      statsTask = cron.schedule(CRON_STATS, () => runCommand('stats', client));
      logSchedule('Stats', statsTask, CRON_STATS);
    }

    // ─── Leaderboard cron ─────────────────────────────────────
    if (lbTask) {
      logger.warn('Leaderboard cron already initialised – skipping duplicate schedule');
    } else {
      lbTask = cron.schedule(CRON_LEADERBOARD, () => runCommand('leaderboard', client));
      logSchedule('Leaderboard', lbTask, CRON_LEADERBOARD);
    }
  },
};

// ─────────────────────────────────────────────────────────────
// helper – fetch and execute a command by name with timing logs
// ─────────────────────────────────────────────────────────────
async function runCommand(cmdName, client) {
  const cmd = client.commands.get(cmdName);
  if (!cmd) {
    logger.warn(`${cmdName} command not found – scheduled task skipped`);
    return;
  }

  try {
    logger.time(`${cmdName}-cron`);
    await cmd.execute(null, null, client); // scheduled run has no message / args
    logger.timeEnd(`${cmdName}-cron`, `Scheduled ${cmdName} finished`);
  } catch (err) {
    logger.error(`Scheduled ${cmdName} failed – ${err.stack || err}`);
  }
}

// helper – log schedule info, compatible with node‑cron v2 (no nextDates)
function logSchedule(label, task, expr) {
  if (typeof task.nextDates === 'function') {
    logger.debug(`${label} cron scheduled ("${expr}") – next: ${task.nextDates().toISOString()}`);
  } else {
    logger.debug(`${label} cron scheduled ("${expr}") – next run time unavailable (node‑cron v2)`);
  }
}
