// utils/logger.js
const { createLogger, format, transports } = require('winston');

const logger = createLogger({
  level: 'info', // Set the minimum level of messages that will be logged
  format: format.combine(
    format.timestamp(),
    format.printf(
      ({ timestamp, level, message }) =>
        `${timestamp} [${level.toUpperCase()}]: ${message}`
    )
  ),
  transports: [new transports.Console()],
});

module.exports = logger;
