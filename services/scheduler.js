// services/scheduler.js
// Centralized cron task scheduling service

import cron from 'node-cron';
import logger from '../utils/logger.js';

const childLogger = logger.child({ label: 'services/scheduler' });

const tasks = new Map();

/**
 * Schedule a recurring task using cron expression
 * @param {string} name - Unique task name
 * @param {string} cronExpr - Cron expression (e.g., '* /5 * * * *')
 * @param {Function} handler - Async function to execute
 * @returns {cron.ScheduledTask}
 */
export function scheduleTask(name, cronExpr, handler) {
  if (tasks.has(name)) {
    childLogger.warn(`Task "${name}" already scheduled – skipping duplicate`);
    return tasks.get(name);
  }

  const task = cron.schedule(cronExpr, async () => {
    childLogger.time(name);
    try {
      await handler();
      childLogger.timeEnd(name, 'Completed');
    } catch (err) {
      childLogger.error(`Task "${name}" failed: ${err.stack || err}`);
    }
  });

  tasks.set(name, task);

  if (typeof task.nextDates === 'function') {
    childLogger.debug(
      `Task "${name}" scheduled ("${cronExpr}") – next: ${task.nextDates().toISOString()}`
    );
  } else {
    childLogger.debug(`Task "${name}" scheduled ("${cronExpr}")`);
  }

  return task;
}

/**
 * Stop a scheduled task
 * @param {string} name - Task name
 */
export function stopTask(name) {
  const task = tasks.get(name);
  if (task) {
    task.stop();
    tasks.delete(name);
    childLogger.info(`Task "${name}" stopped`);
    return true;
  }
  return false;
}

/**
 * Stop all scheduled tasks
 */
export function stopAllTasks() {
  let count = 0;
  for (const [name, task] of tasks) {
    task.stop();
    count++;
    childLogger.debug(`Stopped task "${name}"`);
  }
  tasks.clear();
  childLogger.info(`All scheduled tasks stopped (${count} total)`);
  return count;
}

/**
 * Get list of all scheduled task names
 * @returns {string[]}
 */
export function getScheduledTasks() {
  return Array.from(tasks.keys());
}

/**
 * Check if a task is scheduled
 * @param {string} name - Task name
 * @returns {boolean}
 */
export function isTaskScheduled(name) {
  return tasks.has(name);
}
