const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/eng-reader',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  ai: {
    provider: process.env.AI_PROVIDER || 'deepseekv4flash',
    model: process.env.AI_MODEL || '',
    maxTokens: parseInt(process.env.AI_MAX_TOKENS) || 2048,

    // 各 provider API Key
    keys: {
      openai: process.env.OPENAI_API_KEY || '',
      claude: process.env.CLAUDE_API_KEY || '',
      deepseek: process.env.DEEPSEEK_API_KEY || '',
      deepseekv4flash: process.env.DEEPSEEK_V4_FLASH_API_KEY || '',
      mimo: process.env.MIMO_API_KEY || '',
      moonshot: process.env.MOONSHOT_API_KEY || '',
      zhipu: process.env.ZHIPU_API_KEY || '',
      qwen: process.env.QWEN_API_KEY || '',
    },
  },

  dictApiUrl: process.env.DICT_API_URL || 'https://api.dictionaryapi.dev/api/v2/entries/en',

  email: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'noreply@eng-reader.com',
  },
};
