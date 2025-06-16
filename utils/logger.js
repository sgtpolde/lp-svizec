// utils/logger.js
// ---------------------------------------------------------------------------
// Console‑only Winston logger.
//  • Local TTY  → coloured lines with emoji
//  • PM2/CI     → plain lines (no escape codes, no JSON)
// ---------------------------------------------------------------------------

const { createLogger, format, transports } = require('winston');

const LEVEL = process.env.LOG_LEVEL ?? 'info';
const IS_TTY = process.stdout.isTTY; // false when PM2 captures stdout

// Emoji only if colour is on (TTY)
const ICON = { error: '❌', warn: '⚠️', info: 'ℹ️', http: '🌐', debug: '🐛' };

const oneLine = format.printf(({ timestamp, level, label, message, stack }) => {
  const emoji = IS_TTY ? `${ICON[level] ?? ''} ` : '';
  const scope = label ? `[${label}] ` : '';
  return `${timestamp} ${emoji}${level.toUpperCase()} ${scope}${stack ?? message}`;
});

const logger = createLogger({
  level: LEVEL,
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    IS_TTY ? format.colorize({ all: true }) : format.uncolorize(),
    oneLine
  ),
  transports: [new transports.Console({ handleExceptions: true })],
});

/* helper: logger.childLogger('module') */
logger.childLogger = lbl => logger.child({ label: lbl });

/* console.time‑like helpers */
const timers = new Map();
logger.time = l => l && timers.set(l, process.hrtime.bigint());
logger.timeEnd = (l, note = '') => {
  const s = timers.get(l);
  if (!s) return logger.warn(`Timer "${l}" does not exist.`);
  timers.delete(l);
  const ms = Number(process.hrtime.bigint() - s) / 1e6;
  logger.info(`${note ? note + ' – ' : ''}${l}: ${ms.toFixed(1)} ms`);
};

/* http alias */
logger.http = (...args) => logger.log('http', ...args);

/* surface crashes */
process.on('unhandledRejection', err => logger.error(err.stack || err));
process.on('uncaughtException',  err => logger.error(err.stack || err));

module.exports = logger;
