#!/usr/bin/env node

/**
 * 批量导入文章数据
 *
 * 用法:
 *   node scripts/import-articles.js <json文件路径>
 *
 * JSON 格式:
 * [
 *   {
 *     "title": "文章标题",
 *     "content": "文章正文 (Markdown)",
 *     "difficulty": "B2",
 *     "category": "tech",
 *     "tags": ["AI", "technology"],
 *     "source": "来源",
 *     "questions": [
 *       {
 *         "type": "multiple-choice",
 *         "text": "题目",
 *         "options": ["A", "B", "C", "D"],
 *         "answer": "B",
 *         "explanation": "解析"
 *       }
 *     ]
 *   }
 * ]
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const Article = require('../src/models/Article');
const Exercise = require('../src/models/Exercise');
const { analyzeDifficulty } = require('../src/services/difficulty-analyzer');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eng-reader';

async function importArticles(jsonPath) {
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
      if (!item.title || !item.content) {
        console.log(`跳过: 缺少 title 或 content`);
        skipped++;
        continue;
      }

      // 自动分析难度
      const analysis = analyzeDifficulty(item.content);

      const article = await Article.create({
        title: item.title,
        content: item.content,
        difficulty: item.difficulty || analysis.difficulty,
        category: item.category || 'life',
        tags: item.tags || [],
        source: item.source || '',
        wordCount: analysis.wordCount,
        readingTimeMin: analysis.readingTimeMin,
        isPublished: true,
      });

      // 导入配套练习
      if (item.questions && item.questions.length > 0) {
        await Exercise.create({
          articleId: article._id,
          questions: item.questions,
        });
      }

      imported++;
      console.log(`✓ ${article.title} (${article.difficulty}, ${article.wordCount} 词)`);
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
  console.log('用法: node scripts/import-articles.js <articles.json>');
  console.log('');
  console.log('JSON 格式: [{ title, content, difficulty, category, tags, source, questions }]');
  process.exit(0);
}

importArticles(jsonPath).catch((err) => {
  console.error('导入失败:', err.message);
  process.exit(1);
});
