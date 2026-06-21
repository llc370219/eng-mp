#!/usr/bin/env node

/**
 * ECDICT 词典数据导入脚本
 *
 * 用法：
 *   1. 下载 ECDICT CSV 文件：
 *      https://github.com/skywind3000/ECDICT/releases
 *      解压得到 ecdict.csv
 *
 *   2. 运行导入：
 *      node scripts/import-dict.js <csv文件路径>
 *
 * 示例：
 *      node scripts/import-dict.js ~/Downloads/ecdict.csv
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const mongoose = require('mongoose');

// 加载环境变量
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Dictionary = require('../src/models/Dictionary');

const BATCH_SIZE = 1000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eng-reader';

// 解析 CSV 行（处理逗号和引号内的逗号）
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

// 清理释义文本：将 \n 替换为换行
function cleanText(text) {
  if (!text) return '';
  return text.replace(/\\n/g, '\n').trim();
}

// 解析 exchange 字段
function parseExchange(exchange) {
  if (!exchange) return '';
  return exchange;
}

async function importDict(csvPath) {
  if (!fs.existsSync(csvPath)) {
    console.error(`文件不存在: ${csvPath}`);
    process.exit(1);
  }

  console.log(`连接 MongoDB: ${MONGODB_URI}`);
  await mongoose.connect(MONGODB_URI);
  console.log('MongoDB 已连接');

  // 清空旧数据
  const existingCount = await Dictionary.countDocuments();
  if (existingCount > 0) {
    console.log(`清空已有词典数据 (${existingCount} 条)...`);
    await Dictionary.deleteMany({});
  }

  // 创建读取流
  const fileStream = fs.createReadStream(csvPath, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineNum = 0;
  let imported = 0;
  let skipped = 0;
  let batch = [];

  console.log('开始导入...');

  for await (const line of rl) {
    lineNum++;

    // 跳过表头
    if (lineNum === 1) {
      if (line.toLowerCase().startsWith('word')) continue;
    }

    // 解析字段
    const fields = parseCSVLine(line);
    if (fields.length < 7) {
      skipped++;
      continue;
    }

    const [
      word,        // 0: word
      phonetic,    // 1: phonetic
      definition,  // 2: English definition
      translation, // 3: Chinese translation
      pos,         // 4: part of speech
      collins,     // 5: collins star rating
      oxford,      // 6: oxford flag
      tag,         // 7: exam tags
      bnc,         // 8: BNC frequency
      frq,         // 9: frequency
      exchange,    // 10: word forms
    ] = fields;

    if (!word || word.trim() === '') {
      skipped++;
      continue;
    }

    // 构建示例句子（从 detail JSON 中提取，如果没有则留空）
    const examples = [];

    batch.push({
      word: word.toLowerCase().trim(),
      phonetic: phonetic || '',
      translation: cleanText(translation),
      definitionEn: cleanText(definition),
      collins: collins || '',
      examples,
      tag: (tag || '').trim(),
      exchange: parseExchange(exchange),
    });

    // 批量写入
    if (batch.length >= BATCH_SIZE) {
      try {
        await Dictionary.insertMany(batch, { ordered: false });
        imported += batch.length;
      } catch (err) {
        // 忽略重复键错误
        if (err.code !== 11000) {
          console.error(`批次写入错误 (行 ${lineNum}):`, err.message);
        }
        imported += batch.length;
      }
      batch = [];
      if (imported % 10000 === 0) {
        console.log(`  已导入 ${imported} 条...`);
      }
    }
  }

  // 写入剩余
  if (batch.length > 0) {
    try {
      await Dictionary.insertMany(batch, { ordered: false });
      imported += batch.length;
    } catch (err) {
      if (err.code !== 11000) {
        console.error('最后批次写入错误:', err.message);
      }
      imported += batch.length;
    }
  }

  const finalCount = await Dictionary.countDocuments();
  console.log('\n--- 导入完成 ---');
  console.log(`总行数: ${lineNum}`);
  console.log(`已导入: ${imported}`);
  console.log(`跳过: ${skipped}`);
  console.log(`数据库实际条目: ${finalCount}`);

  // 创建索引（word 字段 schema 已声明 unique，这里确保底层索引存在）
  console.log('创建索引...');
  await Dictionary.collection.createIndex({ word: 1 }, { unique: true });

  await mongoose.disconnect();
  console.log('完成!');
}

// 运行
const csvPath = process.argv[2];
if (!csvPath) {
  console.log('用法: node scripts/import-dict.js <ecdict.csv路径>');
  console.log('');
  console.log('下载 ECDICT:');
  console.log('  https://github.com/skywind3000/ECDICT/releases');
  console.log('  下载 ecdict.csv 并解压');
  process.exit(0);
}

importDict(csvPath).catch((err) => {
  console.error('导入失败:', err.message);
  process.exit(1);
});
