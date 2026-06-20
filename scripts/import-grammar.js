#!/usr/bin/env node

/**
 * 批量导入语法数据
 *
 * 用法:
 *   node scripts/import-grammar.js <json文件路径>
 *
 * JSON 格式: 与 Grammar schema 一致
 * [
 *   {
 *     "title": "一般现在时",
 *     "level": "A1",
 *     "category": "tense",
 *     "explanation": "讲解内容 (Markdown)",
 *     "examples": [{ "sentence": "...", "translation": "...", "highlight": "..." }],
 *     "exercises": [{ "type": "fill-blank", "text": "...", "answer": "...", "explanation": "..." }]
 *   }
 * ]
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const Grammar = require('../src/models/Grammar');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eng-reader';

async function importGrammar(jsonPath) {
  if (!fs.existsSync(jsonPath)) {
    console.error(`文件不存在: ${jsonPath}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  if (!Array.isArray(data)) {
    console.error('JSON 文件必须是数组格式');
    process.exit(1);
  }

  console.log(`连接 MongoDB: ${MONGODB_URI}`);
  await mongoose.connect(MONGODB_URI);
  console.log('MongoDB 已连接\n');

  let imported = 0;
  let skipped = 0;

  for (const item of data) {
    try {
      if (!item.title || !item.explanation) {
        console.log(`跳过: 缺少 title 或 explanation`);
        skipped++;
        continue;
      }

      const grammar = await Grammar.create({
        title: item.title,
        level: item.level || 'B1',
        category: item.category || 'other',
        explanation: item.explanation,
        examples: item.examples || [],
        exercises: item.exercises || [],
      });

      imported++;
      console.log(`✓ ${grammar.title} (${grammar.level}, ${grammar.category})`);
    } catch (err) {
      console.error(`✗ ${item.title || '未知'}: ${err.message}`);
      skipped++;
    }
  }

  console.log(`\n--- 导入完成 ---`);
  console.log(`导入: ${imported}`);
  console.log(`跳过: ${skipped}`);

  await mongoose.disconnect();
}

const jsonPath = process.argv[2];
if (!jsonPath) {
  console.log('用法: node scripts/import-grammar.js <grammar.json>');
  process.exit(0);
}

importGrammar(jsonPath).catch((err) => {
  console.error('导入失败:', err.message);
  process.exit(1);
});
