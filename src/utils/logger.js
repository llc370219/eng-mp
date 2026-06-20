const config = require('../config');

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const COLORS = {
  error: '\x1b[31m',
  warn: '\x1b[33m',
  info: '\x1b[36m',
  debug: '\x1b[90m',
  reset: '\x1b[0m',
};

const currentLevel = config.nodeEnv === 'production' ? LEVELS.info : LEVELS.debug;

function formatMessage(level, ...args) {
  const timestamp = new Date().toISOString();
  const prefix = config.nodeEnv === 'production'
    ? `[${timestamp}] [${level.toUpperCase()}]`
    : `${COLORS[level]}[${level.toUpperCase()}]${COLORS.reset}`;

  return [prefix, ...args];
}

const logger = {
  error(...args) {
    if (currentLevel >= LEVELS.error) {
      console.error(...formatMessage('error', ...args));
    }
  },
  warn(...args) {
    if (currentLevel >= LEVELS.warn) {
      console.warn(...formatMessage('warn', ...args));
    }
  },
  info(...args) {
    if (currentLevel >= LEVELS.info) {
      console.log(...formatMessage('info', ...args));
    }
  },
  debug(...args) {
    if (currentLevel >= LEVELS.debug) {
      console.log(...formatMessage('debug', ...args));
    }
  },
};

module.exports = logger;
