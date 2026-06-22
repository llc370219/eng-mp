const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  description: { type: String, default: '' },
}, { timestamps: true });

// 默认设置
const DEFAULTS = {
  siteName: { value: '英语阅读学习', description: '站点名称' },
  allowRegistration: { value: true, description: '是否开放注册' },
  requireInviteCode: { value: true, description: '是否需要邀请码' },
  enableAIGeneration: { value: true, description: '是否启用用户端 AI 鲜榨文章' },
  defaultUserLevel: { value: '初中', description: '默认用户等级' },
  aiProvider: { value: 'deepseek', description: '默认AI提供商' },
  aiModel: { value: '', description: 'AI模型（留空使用提供商默认）' },
  aiMaxTokens: { value: 2048, description: 'AI最大Token数' },
  aiApiKey_openai: { value: '', description: 'OpenAI API Key' },
  aiApiKey_claude: { value: '', description: 'Claude API Key' },
  aiApiKey_deepseek: { value: '', description: 'DeepSeek API Key' },
  aiApiKey_mimo: { value: '', description: 'MiMo API Key' },
  aiApiKey_moonshot: { value: '', description: 'Moonshot API Key' },
  aiApiKey_zhipu: { value: '', description: '智谱 API Key' },
  aiApiKey_qwen: { value: '', description: '通义千问 API Key' },
  aiApiKey_ark: { value: '', description: '火山方舟 API Key' },
  dailyCheckInMin: { value: 5, description: '打卡最低学习分钟' },
  maintenanceMode: { value: false, description: '维护模式' },
};

systemSettingSchema.statics.initDefaults = async function () {
  for (const [key, config] of Object.entries(DEFAULTS)) {
    await this.updateOne({ key }, { $setOnInsert: { key, ...config } }, { upsert: true });
  }
};

systemSettingSchema.statics.get = async function (key) {
  const doc = await this.findOne({ key });
  return doc ? doc.value : DEFAULTS[key]?.value;
};

systemSettingSchema.statics.set = async function (key, value) {
  await this.updateOne({ key }, { $set: { value } }, { upsert: true });
};

systemSettingSchema.statics.getAll = async function () {
  const docs = await this.find({});
  const result = {};
  for (const doc of docs) result[doc.key] = doc.value;
  // 填充默认值
  for (const [key, config] of Object.entries(DEFAULTS)) {
    if (result[key] === undefined) result[key] = config.value;
  }
  return result;
};

module.exports = mongoose.model('SystemSetting', systemSettingSchema);
