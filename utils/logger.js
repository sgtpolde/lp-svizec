// utils/logger.js

const { createLogger, format, transports } = require('winston');

// ---------------------------------------------------------------------------
// #1  Settings & util maps
// ---------------------------------------------------------------------------
const LOG_LEVEL = process.env.LOG_LEVEL ?? 'info';
const IS_PROD = process.env.NODE_ENV === 'production';

// Cute unicode icons for quick scanning in dev console
const LEVEL_ICONS = {
  error: '❌',
  warn: '⚠️',
  info: 'ℹ️',
  http: '🌐',
  verbose: '🔍',
  debug: '🐛',
  silly: '🤪',
};

// ---------------------------------------------------------------------------
// #2  Custom formats
// ---------------------------------------------------------------------------
const devPrintf = format.printf(({ timestamp, level, message, label, stack, ...meta }) => {
  const icon = LEVEL_ICONS[level] || '';
  const lbl = label ? `[${label}] ` : '';
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  const line = stack ?? message;
  return `${timestamp} ${icon} ${level.toUpperCase()} ${lbl}${line}${metaStr}`;
});

const baseFormat = format.combine(
  format.errors({ stack: true }), // log .stack for Error objects
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  IS_PROD ? format.uncolorize() : format.colorize({ all: true }),
  IS_PROD ? format.json() : devPrintf
);

// ---------------------------------------------------------------------------
// #3  Logger instance
// ---------------------------------------------------------------------------
const logger = createLogger({
  level: LOG_LEVEL,
  format: baseFormat,
  transports: [new transports.Console({ handleExceptions: true })],
});

// ---------------------------------------------------------------------------
// #4  Timing helpers (similar to console.time)
// ---------------------------------------------------------------------------
const __timers = new Map();

logger.time = label => {
  if (!label) return;
  __timers.set(label, process.hrtime.bigint());
};

logger.timeEnd = (label, msg = '') => {
  const start = __timers.get(label);
  if (!start) {
    logger.warn(`Timer "${label}" does not exist.`);
    return;
  }
  const durationMs = Number(process.hrtime.bigint() - start) / 1e6; // ns → ms
  __timers.delete(label);
  logger.info(`${msg ? msg + ' – ' : ''}${label}: ${durationMs.toFixed(1)} ms`);
};

// ---------------------------------------------------------------------------
// #5  Export
// ---------------------------------------------------------------------------
module.exports = logger;
