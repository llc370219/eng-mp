#!/usr/bin/env node
/**
 * 为公共文章「提前生成」逐句翻译（彩云小译）+ 逐段语法（AI，可选）。
 * 生成后存入 Article.sentenceTranslations / grammarPoints，
 * 阅读卡片直接展示，无需实时调用 AI。
 *
 * 用法：
 *   node scripts/pregenerate-translations.js            # 处理所有已发布文章
 *   node scripts/pregenerate-translations.js --force    # 重新生成（覆盖已有）
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const config = require('../src/config');
const caiyun = require('../src/services/caiyun');

const FORCE = process.argv.includes('--force');

// 与前端 buildArticleData 完全一致的切句逻辑，保证 en 键能对上
function splitSentences(paragraph) {
  return (paragraph.match(/[^.!?]+[.!?]+["'”’)\]]*|[^.!?]+$/g) || [paragraph])
    .map(s => s.trim()).filter(Boolean);
}
function splitParagraphs(content) {
  return (content || '').split(/\n+/).map(p => p.trim()).filter(Boolean);
}

async function chunkTranslate(sentences) {
  const out = [];
  const SIZE = 20;
  for (let i = 0; i < sentences.length; i += SIZE) {
    const batch = sentences.slice(i, i + SIZE);
    const zh = await caiyun.translate(batch, 'en2zh');
    batch.forEach((en, j) => out.push({ en, zh: zh[j] || '' }));
  }
  return out;
}

// 逐段语法（AI，可选）。无 AI key 时返回 []
async function genGrammar(paragraphs) {
  let ai;
  try { ai = require('../src/services/ai'); } catch { return []; }
  const points = [];
  for (const p of paragraphs) {
    try {
      const sys = '你是英语语法老师。请用一句话（中文，40 字内）指出下面这段英文中最值得讲解的一个语法点（如时态、从句、非谓语、倒装等），只返回 JSON：{"title":"语法点名称","explanation":"简要说明"}。';
      const raw = await ai.chat(sys, p, {});
      const j = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
      points.push({ title: j.title || '', explanation: j.explanation || '', example: '' });
    } catch {
      points.push({ title: '', explanation: '', example: '' });
    }
  }
  return points;
}

async function main() {
  if (!caiyun.enabled()) {
    console.error('✗ 未配置 CAIYUN_TOKEN，无法翻译。请在 .env 设置后重试。');
    process.exit(1);
  }
  await mongoose.connect(config.mongodb.uri);
  console.log('MongoDB 已连接:', config.mongodb.uri);
  const Article = require('../src/models/Article');

  const filter = { isPublished: true };
  if (!FORCE) filter.$or = [{ sentenceTranslations: { $exists: false } }, { sentenceTranslations: { $size: 0 } }];
  const articles = await Article.find(filter);
  console.log(`待处理文章：${articles.length} 篇${FORCE ? '（--force 覆盖）' : '（仅缺翻译的）'}`);

  const hasAI = !!(config.ai.keys[config.ai.provider]);
  console.log(hasAI ? '✓ 检测到 AI key，将同时生成逐段语法' : 'ℹ 未配置 AI key，跳过语法生成（仅翻译）');

  let done = 0;
  for (const a of articles) {
    const paragraphs = splitParagraphs(a.content);
    const sentences = [];
    paragraphs.forEach(p => splitSentences(p).forEach(s => sentences.push(s)));
    if (!sentences.length) { console.log(`  跳过（无正文）：${a.title}`); continue; }

    const sentenceTranslations = await chunkTranslate(sentences);
    a.sentenceTranslations = sentenceTranslations;
    if (hasAI) a.grammarPoints = await genGrammar(paragraphs);
    await a.save();
    done++;
    const ok = sentenceTranslations.filter(s => s.zh).length;
    console.log(`  ✓ ${a.title} — ${ok}/${sentences.length} 句已翻译${hasAI ? ' + 语法' : ''}`);
  }

  console.log(`\n完成：${done} 篇文章已写入提前生成内容。`);
  await mongoose.disconnect();
}

main().catch(err => { console.error('失败:', err.message); process.exit(1); });
