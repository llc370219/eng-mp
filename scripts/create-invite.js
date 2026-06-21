#!/usr/bin/env node

/**
 * 生成邀请码脚本
 *
 * 用法: node scripts/create-invite.js [次数] [备注]
 * 示例: node scripts/create-invite.js 20 "分享链接"
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const InviteCode = require('../src/models/InviteCode');
const User = require('../src/models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eng-reader';

async function main() {
  const maxUses = parseInt(process.argv[2]) || 20;
  const note = process.argv[3] || '分享链接邀请码';

  await mongoose.connect(MONGODB_URI);

  // 获取管理员用户
  const admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    console.error('❌ 未找到管理员用户，请先运行 setup-admin.js');
    process.exit(1);
  }

  // 生成邀请码
  const code = InviteCode.generateCode();

  const inviteCode = await InviteCode.create({
    code,
    createdBy: admin._id,
    maxUses,
    note,
    isActive: true,
  });

  console.log('✅ 邀请码已生成\n');
  console.log(`   邀请码: ${code}`);
  console.log(`   可用次数: ${maxUses}`);
  console.log(`   备注: ${note}`);
  console.log(`\n📎 分享链接:`);
  console.log(`   https://backend-production-4413.up.railway.app/demo/register?invite=${code}`);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('❌ 错误:', err.message);
  process.exit(1);
});
