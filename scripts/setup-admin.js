#!/usr/bin/env node

/**
 * 管理员账号初始化脚本
 * - 创建/更新指定管理员账号
 * - 删除测试用户（admin, test 等）
 *
 * 用法: node scripts/setup-admin.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eng-reader';

// 管理员配置（密码从环境变量读取，切勿硬编码进仓库）
// 用法: ADMIN_PASSWORD='你的强密码' node scripts/setup-admin.js
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'llc370219@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const ADMIN_NICKNAME = process.env.ADMIN_NICKNAME || '管理员';

if (!ADMIN_PASSWORD) {
  console.error('✗ 请通过环境变量提供管理员密码：ADMIN_PASSWORD=你的密码 node scripts/setup-admin.js');
  process.exit(1);
}

// 需要删除的测试用户邮箱
const TEST_EMAILS = [
  'admin@test.com',
  'test@test.com',
  'admin@example.com',
  'test@example.com',
];

async function main() {
  console.log('🔗 连接数据库...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ 数据库已连接\n');

  // 1. 删除测试用户
  console.log('🗑️  清理测试用户...');
  for (const email of TEST_EMAILS) {
    const result = await User.deleteOne({ email });
    if (result.deletedCount > 0) {
      console.log(`   ✓ 已删除: ${email}`);
    }
  }

  // 2. 创建/更新管理员账号
  console.log('\n👤 配置管理员账号...');
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const admin = await User.findOneAndUpdate(
    { email: ADMIN_EMAIL },
    {
      $set: {
        email: ADMIN_EMAIL,
        passwordHash,
        nickname: ADMIN_NICKNAME,
        role: 'admin',
        emailVerified: true,
        level: 'CET6',
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );

  console.log(`   ✓ 管理员账号: ${ADMIN_EMAIL}`);
  console.log(`   ✓ 密码: ${ADMIN_PASSWORD}`);
  console.log(`   ✓ 角色: admin`);
  console.log(`   ✓ 用户 ID: ${admin._id}`);

  // 3. 统计当前用户
  console.log('\n📊 当前用户统计:');
  const totalUsers = await User.countDocuments();
  const adminCount = await User.countDocuments({ role: 'admin' });
  const userCount = await User.countDocuments({ role: 'user' });
  console.log(`   总用户数: ${totalUsers}`);
  console.log(`   管理员: ${adminCount}`);
  console.log(`   普通用户: ${userCount}`);

  console.log('\n✅ 管理员配置完成！');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('❌ 错误:', err.message);
  process.exit(1);
});
