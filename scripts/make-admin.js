#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eng-reader';

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.log('用法: node scripts/make-admin.js <email>');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  const user = await User.findOne({ email });
  if (!user) {
    console.log(`用户不存在: ${email}`);
    process.exit(1);
  }

  user.role = 'admin';
  await user.save();
  console.log(`✅ ${email} 已设为管理员`);
  await mongoose.disconnect();
}

main().catch(err => { console.error(err.message); process.exit(1); });
