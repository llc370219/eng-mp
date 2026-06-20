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
  defaultUserLevel: { value: 'A1', description: '默认用户等级' },
  aiProvider: { value: 'deepseek', description: '默认AI提供商' },
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
