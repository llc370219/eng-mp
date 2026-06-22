#!/usr/bin/env node

/**
 * 基础种子数据脚本
 * 写入示例词典、文章、练习、语法数据，用于开发测试
 *
 * 用法: node scripts/seed.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const Article = require('../src/models/Article');
const Dictionary = null; // Removed
const Exercise = require('../src/models/Exercise');
const Grammar = require('../src/models/Grammar');
const { analyzeDifficulty } = require('../src/services/difficulty-analyzer');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eng-reader';

// ===== 词典种子数据 =====
const DICT_DATA = []; /*
  {
    word: 'ubiquitous',
    phonetic: '/juːˈbɪkwɪtəs/',
    translation: 'adj. 无处不在的，普遍存在的',
    definitionEn: 'present, appearing, or found everywhere',
    collins: '4',
    tag: 'CET6 GRE',
    examples: [
      'Mobile phones have become ubiquitous in modern society.',
      'The ubiquitous coffee shops can be found on every corner.',
    ],
  },
  {
    word: 'eloquent',
    phonetic: '/ˈeləkwənt/',
    translation: 'adj. 雄辩的，有口才的；富有表现力的',
    definitionEn: 'fluent or persuasive in speaking or writing',
    collins: '3',
    tag: 'CET6 GRE',
    examples: [
      'She gave an eloquent speech about climate change.',
      'His silence was more eloquent than words.',
    ],
  },
  {
    word: 'resilient',
    phonetic: '/rɪˈzɪliənt/',
    translation: 'adj. 有弹性的；能迅速恢复的',
    definitionEn: 'able to withstand or recover quickly from difficult conditions',
    collins: '3',
    tag: 'CET6',
    examples: [
      'Children are often more resilient than adults think.',
      'The economy proved resilient despite the crisis.',
    ],
  },
  {
    word: 'paradigm',
    phonetic: '/ˈpærədaɪm/',
    translation: 'n. 范式，典范，模式',
    definitionEn: 'a typical example or pattern of something; a model',
    collins: '3',
    tag: 'CET6 GRE',
    examples: [
      'The discovery represented a paradigm shift in physics.',
      'This company is a paradigm of modern management.',
    ],
  },
  {
    word: 'meticulous',
    phonetic: '/məˈtɪkjʊləs/',
    translation: 'adj. 一丝不苟的，极其细心的',
    definitionEn: 'showing great attention to detail; very careful',
    collins: '3',
    tag: 'CET6 GRE',
    examples: [
      'She is meticulous about her research methodology.',
      'The painting shows meticulous attention to detail.',
    ],
  },
  {
    word: 'pragmatic',
    phonetic: '/præɡˈmætɪk/',
    translation: 'adj. 务实的，实用主义的',
    definitionEn: 'dealing with things sensibly and realistically',
    collins: '3',
    tag: 'CET6 GRE',
    examples: [
      'We need a pragmatic approach to this problem.',
      'She is a pragmatic leader who focuses on results.',
    ],
  },
  {
    word: 'deteriorate',
    phonetic: '/dɪˈtɪəriəreɪt/',
    translation: 'v. 恶化，变坏',
    definitionEn: 'become progressively worse',
    collins: '3',
    tag: 'CET6',
    examples: [
      'His health continued to deteriorate.',
      'Relations between the two countries have deteriorated.',
    ],
  },
  {
    word: 'comprehensive',
    phonetic: '/ˌkɒmprɪˈhensɪv/',
    translation: 'adj. 综合的，全面的',
    definitionEn: 'complete; including all or nearly all elements or aspects',
    collins: '3',
    tag: 'CET4 CET6',
    examples: [
      'The report provides a comprehensive overview of the situation.',
      'We need a comprehensive solution to this problem.',
    ],
  },
  {
    word: 'inevitable',
    phonetic: '/ɪnˈevɪtəbl/',
    translation: 'adj. 不可避免的，必然的',
    definitionEn: 'certain to happen; unavoidable',
    collins: '3',
    tag: 'CET4 CET6',
    examples: [
      'Change is inevitable in any organization.',
      'The conclusion was inevitable.',
    ],
  },
  {
    word: 'sophisticated',
    phonetic: '/səˈfɪstɪkeɪtɪd/',
    translation: 'adj. 复杂精密的；老练的',
    definitionEn: 'having or appealing to refined worldly knowledge',
    collins: '3',
    tag: 'CET4 CET6',
    examples: [
      'The technology has become increasingly sophisticated.',
      'She has sophisticated tastes in art.',
    ],
  },
];

// ===== 文章种子数据 =====
const ARTICLES = [
  {
    title: 'The Rise of Artificial Intelligence',
    category: 'tech',
    difficulty: 'B2',
    tags: ['AI', 'technology', 'future'],
    content: `Artificial intelligence has become one of the most transformative technologies of the 21st century. From virtual assistants on our smartphones to complex algorithms that drive autonomous vehicles, AI is reshaping how we live and work.

Machine learning, a subset of AI, allows computers to learn from data without being explicitly programmed. This technology powers recommendation systems on streaming platforms, helps doctors diagnose diseases more accurately, and enables businesses to predict market trends.

However, the rapid advancement of AI also raises important ethical questions. How do we ensure that AI systems are fair and unbiased? What happens to jobs that can be automated? These are challenges that society must address as AI continues to evolve.

Despite these concerns, many experts believe that AI will ultimately benefit humanity by solving complex problems in healthcare, climate change, and education. The key is to develop AI responsibly, with proper regulations and human oversight.

The future of AI is both exciting and uncertain. One thing is clear: artificial intelligence will continue to play an increasingly important role in our daily lives.`,
    source: 'AI Weekly',
  },
  {
    title: 'A Walk Through Central Park',
    category: 'life',
    difficulty: 'B1',
    tags: ['New York', 'parks', 'nature'],
    content: `Central Park is a beautiful green space in the heart of New York City. Every year, millions of visitors come to enjoy its gardens, lakes, and walking paths.

In spring, the park comes alive with colorful flowers. Cherry blossoms bloom along the pathways, and families gather for picnics on the grass. The air is fresh and warm, perfect for a leisurely stroll.

Summer in Central Park is full of activity. People jog, cycle, and play sports. The famous Bethesda Fountain attracts photographers from around the world. In the evening, free concerts and theater performances entertain crowds under the stars.

Autumn transforms the park into a canvas of red, orange, and gold. The leaves change color, creating stunning views that attract artists and nature lovers. It is the perfect time for a peaceful walk.

Even in winter, Central Park has its charm. When snow falls, the park becomes a winter wonderland. Children build snowmen, and couples walk hand in hand along the quiet paths.

Central Park is more than just a park. It is a place where people connect with nature and with each other, right in the middle of one of the world's busiest cities.`,
    source: 'Travel Magazine',
  },
  {
    title: 'The Science of Sleep',
    category: 'science',
    difficulty: 'B2',
    tags: ['health', 'science', 'sleep'],
    content: `Sleep is one of the most important yet least understood aspects of human life. Scientists have discovered that sleep plays a crucial role in memory, learning, and physical health.

During sleep, the brain goes through several stages. The first stage is light sleep, where you can be easily awakened. The second stage is deeper, and the brain begins to consolidate memories. The third stage is the deepest sleep, essential for physical recovery. Finally, REM (Rapid Eye Movement) sleep is when most dreaming occurs.

Research shows that adults need between seven and nine hours of sleep each night. However, modern lifestyles often interfere with healthy sleep patterns. The blue light from screens suppresses melatonin, the hormone that helps us fall asleep. Late-night work and social activities also disrupt our natural sleep cycles.

Chronic sleep deprivation has been linked to serious health problems, including obesity, diabetes, heart disease, and mental health disorders. It also impairs cognitive function, making it harder to concentrate and make decisions.

To improve sleep quality, experts recommend maintaining a regular sleep schedule, avoiding caffeine in the evening, and creating a comfortable sleep environment. Regular exercise also helps, but it should be done earlier in the day.

Understanding the science of sleep can help us make better choices about our daily habits and prioritize this essential aspect of our health.`,
    source: 'Health Journal',
  },
  {
    title: 'Learning a New Language',
    category: 'life',
    difficulty: 'A2',
    tags: ['language', 'learning', 'tips'],
    content: `Learning a new language can be a fun and rewarding experience. It opens doors to new cultures, helps you meet new people, and can even improve your career prospects.

There are many ways to learn a language. You can take classes at a school or university. You can use apps on your phone. You can also watch movies and listen to music in the language you want to learn.

The most important thing is to practice every day. Even ten minutes a day can make a big difference. Try to speak with native speakers whenever possible. Do not be afraid of making mistakes. Everyone makes mistakes when learning something new.

Reading books and articles in your target language is also very helpful. Start with simple texts and gradually move to more difficult ones. Keep a vocabulary notebook and review new words regularly.

Many successful language learners say that immersion is the best method. This means surrounding yourself with the language as much as possible. Change the language on your phone. Listen to podcasts during your commute. Think in the new language.

Remember, learning a language takes time and patience. Do not give up if progress seems slow. Every step forward is an achievement.`,
    source: 'Education Today',
  },
  {
    title: 'The Impact of Climate Change on Ocean Ecosystems',
    category: 'science',
    difficulty: 'C1',
    tags: ['climate', 'environment', 'ocean'],
    content: `The world's oceans are experiencing unprecedented changes due to climate change. Rising temperatures, acidification, and sea-level rise are fundamentally altering marine ecosystems in ways that scientists are only beginning to understand.

Ocean temperatures have increased by approximately 0.7°C since the late 19th century. This warming is causing coral reefs to bleach and die at alarming rates. The Great Barrier Reef, the world's largest coral reef system, has experienced multiple mass bleaching events in recent years, threatening the biodiversity it supports.

Ocean acidification, often called "the other CO2 problem," occurs when the ocean absorbs carbon dioxide from the atmosphere. This process reduces the pH of seawater, making it more acidic. Organisms that build shells or skeletons from calcium carbonate, such as oysters, clams, and certain plankton species, are particularly vulnerable to these changes.

Sea-level rise, driven by thermal expansion of seawater and melting ice sheets, poses a significant threat to coastal ecosystems. Mangrove forests and salt marshes, which serve as critical nurseries for many marine species, are being submerged and eroded.

The consequences of these changes extend far beyond the ocean itself. Billions of people depend on marine ecosystems for food, livelihoods, and coastal protection. The collapse of fisheries could have devastating economic and social impacts, particularly in developing nations.

Addressing these challenges requires immediate and coordinated global action to reduce greenhouse gas emissions and protect marine habitats. Marine protected areas, sustainable fishing practices, and investment in ocean research are essential components of any comprehensive strategy.`,
    source: 'Nature Reviews',
  },
];

// ===== 语法种子数据 =====
const GRAMMAR_DATA = [
  {
    title: '一般现在时 (Simple Present)',
    level: 'A1',
    category: 'tense',
    explanation: `## 一般现在时

一般现在时表示经常发生的动作、客观事实或习惯性行为。

### 构成
- **肯定句**: 主语 + 动词原形（第三人称单数加 -s/-es）
- **否定句**: 主语 + do/does + not + 动词原形
- **疑问句**: Do/Does + 主语 + 动词原形？

### 用法
1. 表示习惯性动作：I **go** to school every day.
2. 表示客观事实：The sun **rises** in the east.
3. 表示现在的状态：She **works** as a teacher.`,
    examples: [
      { sentence: 'I play tennis every weekend.', translation: '我每个周末打网球。', highlight: 'play' },
      { sentence: 'She speaks three languages.', translation: '她说三种语言。', highlight: 'speaks' },
      { sentence: 'The train leaves at 8 o\'clock.', translation: '火车八点出发。', highlight: 'leaves' },
      { sentence: 'Do you like coffee?', translation: '你喜欢咖啡吗？', highlight: 'Do...like' },
    ],
    exercises: [
      { type: 'fill-blank', text: 'She ___ (go) to work by bus every day.', answer: 'goes', explanation: '第三人称单数，go 加 -es' },
      { type: 'multiple-choice', text: 'The earth ___ around the sun.', options: ['revolve', 'revolves', 'revolving', 'revolved'], answer: 'revolves', explanation: '客观事实用一般现在时，第三人称单数' },
      { type: 'fill-blank', text: 'They ___ (not eat) meat.', answer: 'do not eat', explanation: '否定句用 do not + 动词原形' },
    ],
  },
  {
    title: '现在完成时 (Present Perfect)',
    level: 'B1',
    category: 'tense',
    explanation: `## 现在完成时

现在完成时表示过去发生的动作对现在产生影响，或从过去持续到现在的状态。

### 构成
- **肯定句**: 主语 + have/has + 过去分词
- **否定句**: 主语 + have/has + not + 过去分词
- **疑问句**: Have/Has + 主语 + 过去分词？

### 用法
1. 表示过去发生但对现在有影响的动作：I **have lost** my key. (现在没有钥匙)
2. 表示从过去持续到现在的状态：She **has lived** here for ten years.
3. 与 already, yet, just, ever, never 等连用`,
    examples: [
      { sentence: 'I have already finished my homework.', translation: '我已经做完作业了。', highlight: 'have...finished' },
      { sentence: 'She has never been to Japan.', translation: '她从未去过日本。', highlight: 'has never been' },
      { sentence: 'Have you ever seen this movie?', translation: '你看过这部电影吗？', highlight: 'Have...seen' },
      { sentence: 'We have known each other since childhood.', translation: '我们从小认识。', highlight: 'have known' },
    ],
    exercises: [
      { type: 'fill-blank', text: 'I ___ (see) that movie three times.', answer: 'have seen', explanation: '表示到目前为止的经历' },
      { type: 'multiple-choice', text: 'She ___ here since 2020.', options: ['lives', 'lived', 'has lived', 'is living'], answer: 'has lived', explanation: 'since + 时间点，用现在完成时' },
      { type: 'fill-blank', text: '___ you ___ (finish) your work yet?', answer: 'Have...finished', explanation: 'yet 用于现在完成时的疑问句' },
    ],
  },
  {
    title: '定语从句 (Relative Clauses)',
    level: 'B1',
    category: 'clause',
    explanation: `## 定语从句

定语从句用来修饰名词或代词，由关系代词（who, which, that, whose, whom）或关系副词（where, when, why）引导。

### 关系代词
- **who/whom**: 指人
- **which**: 指物
- **that**: 指人或物（限制性定语从句）
- **whose**: 表示所有关系

### 限制性 vs 非限制性
- 限制性：不加逗号，是句子意思不可缺少的部分
- 非限制性：加逗号，提供补充信息`,
    examples: [
      { sentence: 'The man who lives next door is a doctor.', translation: '住在隔壁的那个人是医生。', highlight: 'who lives next door' },
      { sentence: 'The book which I borrowed was interesting.', translation: '我借的那本书很有趣。', highlight: 'which I borrowed' },
      { sentence: 'The city where I grew up has changed a lot.', translation: '我长大的城市变化很大。', highlight: 'where I grew up' },
      { sentence: 'My brother, who is a teacher, lives in Beijing.', translation: '我哥哥是老师，他住在北京。', highlight: 'who is a teacher' },
    ],
    exercises: [
      { type: 'multiple-choice', text: 'The girl ___ won the prize is my classmate.', options: ['which', 'who', 'whose', 'whom'], answer: 'who', explanation: '先行词是人，用 who' },
      { type: 'fill-blank', text: 'This is the house ___ (where/which) I was born.', answer: 'where', explanation: '修饰地点用 where' },
      { type: 'multiple-choice', text: 'The movie ___ we watched last night was great.', options: ['who', 'where', 'that', 'whose'], answer: 'that', explanation: '先行词是物，限制性定语从句用 that' },
    ],
  },
  {
    title: '虚拟语气 (Subjunctive Mood)',
    level: 'B2',
    category: 'mood',
    explanation: `## 虚拟语气

虚拟语气用于表示假设、愿望、建议等非真实的情况。

### 与现在事实相反
- If + 主语 + 动词过去式, 主语 + would/could/might + 动词原形
- If I **were** you, I **would** accept the offer.

### 与过去事实相反
- If + 主语 + had + 过去分词, 主语 + would/could/might + have + 过去分词
- If I **had known**, I **would have helped**.

### 与将来事实相反
- If + 主语 + should/were to + 动词原形, 主语 + would + 动词原形`,
    examples: [
      { sentence: 'If I were rich, I would travel the world.', translation: '如果我有钱，我会环游世界。（现在没有钱）', highlight: 'were...would travel' },
      { sentence: 'If she had studied harder, she would have passed.', translation: '如果她更努力学习，她就通过了。（实际没通过）', highlight: 'had studied...would have passed' },
      { sentence: 'I wish I could speak English fluently.', translation: '我希望我能流利地说英语。（现在不能）', highlight: 'could speak' },
      { sentence: 'He suggested that she take a taxi.', translation: '他建议她打车。', highlight: 'take' },
    ],
    exercises: [
      { type: 'fill-blank', text: 'If I ___ (be) you, I would apologize.', answer: 'were', explanation: '虚拟语气中，所有人称都用 were' },
      { type: 'multiple-choice', text: 'If he ___ earlier, he wouldn\'t have missed the train.', options: ['left', 'had left', 'has left', 'leaves'], answer: 'had left', explanation: '与过去事实相反，用 had + 过去分词' },
      { type: 'fill-blank', text: 'I wish I ___ (know) the answer.', answer: 'knew', explanation: 'wish + 过去式，表示与现在事实相反' },
*/

// ===== 导入函数 =====

async function seedDict() {
  console.log('词典: 已弃用本地导入，跳过');
}

async function seedArticles() {
  const count = await Article.countDocuments();
  if (count > 0) {
    console.log(`文章已有 ${count} 条数据，跳过`);
    return;
  }

  for (const data of ARTICLES) {
    const analysis = analyzeDifficulty(data.content);
    const article = await Article.create({
      ...data,
      wordCount: analysis.wordCount,
      readingTimeMin: analysis.readingTimeMin,
      isPublished: true,
    });

    // 为每篇文章创建配套练习
    await Exercise.create({
      articleId: article._id,
      questions: generateArticleQuestions(data),
    });
  }
  console.log(`文章: 写入 ${ARTICLES.length} 篇 + 配套练习`);
}

async function seedGrammar() {
  const count = await Grammar.countDocuments();
  if (count > 0) {
    console.log(`语法已有 ${count} 条数据，跳过`);
    return;
  }
  await Grammar.insertMany(GRAMMAR_DATA);
  console.log(`语法: 写入 ${GRAMMAR_DATA.length} 条`);
}

// 为文章生成简单练习题
function generateArticleQuestions(article) {
  return [
    {
      type: 'multiple-choice',
      text: `What is the main topic of "${article.title}"?`,
      options: [
        article.tags[0] || 'Topic A',
        'Unrelated topic',
        'Another topic',
        'None of the above',
      ],
      answer: article.tags[0] || 'Topic A',
      explanation: `文章主要讨论了${article.tags[0] || '相关主题'}。`,
    },
    {
      type: 'true-false',
      text: `The article suggests that ${article.tags[0] || 'the topic'} is important.`,
      options: ['True', 'False'],
      answer: 'True',
      explanation: '文章明确表达了这一观点。',
    },
    {
      type: 'multiple-choice',
      text: `Which difficulty level best describes this article?`,
      options: ['A1', 'B1', 'B2', 'C2'],
      answer: article.difficulty,
      explanation: `本文章难度为 ${article.difficulty}。`,
    },
  ];
}

// 主流程
async function main() {
  console.log(`连接 MongoDB: ${MONGODB_URI}`);
  await mongoose.connect(MONGODB_URI);
  console.log('MongoDB 已连接\n');

  await seedDict();
  await seedArticles();
  await seedGrammar();

  console.log('\n种子数据导入完成!');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('导入失败:', err.message);
  process.exit(1);
});
