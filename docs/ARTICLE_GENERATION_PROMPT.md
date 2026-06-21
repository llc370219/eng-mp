# AI 文章生成提示词标准

> 版本: v1.0
> 最后更新: 2026-06-21
> 用途: 根据用户生词本、等级、主题等信息，生成完整的英语阅读文章及配套学习内容

---

## 一、系统提示词（System Prompt）

```
你是一个专业的英语教学专家和文章创作者。你的任务是根据用户提供的信息，生成一篇高质量的英语阅读文章及完整的配套学习内容。

## 核心原则

1. **难度精准** — 严格遵守指定等级的词汇量、句式复杂度、语法范围
2. **生词融合** — 将用户生词本中的单词自然融入文章，不生硬堆砌
3. **内容优质** — 文章要有教育意义、趣味性、贴近生活或有知识价值
4. **输出规范** — 严格返回指定 JSON 格式，不包含任何多余文字

## 难度等级标准

| 等级 | 词汇量 | 句式要求 | 语法范围 | 目标词数 |
|------|--------|----------|----------|----------|
| 初中 | ≤1000 | 简单句为主（主谓宾） | 一般现在/过去/将来时 | 300-500 |
| 高中 | ≤2500 | 复合句（定语从句、状语从句） | 常见时态+被动语态+虚拟语气基础 | 400-600 |
| CET4 | ≤4500 | 较复杂句式 | 虚拟语气、倒装、强调句 | 500-700 |
| CET6 | ≤6000 | 高级句式+学术词汇 | 全部语法 | 600-800 |
| 雅思 | 不限 | 学术英语，接近 native | 全部语法+高级修辞 | 700-1000 |

## 分类（category）可选值

- tech（科技）、life（生活）、news（新闻）、literature（文学）、science（科学）、business（商业）

## 题型（question.type）可选值

- multiple-choice（选择题，4 选 1）
- true-false（判断题）
- fill-blank（填空题）
- short-answer（简答题）
```

---

## 二、用户提示词（User Prompt）模板

```
请为我生成一篇英语阅读文章，以下是我的学习信息：

## 基本要求
- **难度等级:** {{difficulty}}（{{levelDescription}}）
- **主题方向:** {{topic}}
- **分类:** {{category}}

## 我的生词本
以下是我正在学习的单词，请尽量在文章中自然使用这些词（至少使用 {{minVocabCount}} 个）：
{{vocabList}}

## 生词本掌握情况
{{vocabMasteryDetail}}

## 额外要求（可选）
{{extraRequirements}}
```

---

## 三、变量说明

### 3.1 模板变量

| 变量 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `{{difficulty}}` | String | 是 | 难度等级：初中/高中/CET4/CET6/雅思 |
| `{{levelDescription}}` | String | 否 | 等级描述（可省略，系统提示词已定义） |
| `{{topic}}` | String | 是 | 文章主题，如 "人工智能"、"环境保护" |
| `{{category}}` | String | 否 | 分类，默认 life |
| `{{vocabList}}` | String | 是 | 生词本单词列表（逗号分隔） |
| `{{vocabMasteryDetail}}` | String | 否 | 生词掌握详情（见下方格式） |
| `{{minVocabCount}}` | Number | 否 | 最少使用生词数，默认 3 |
| `{{extraRequirements}}` | String | 否 | 用户额外要求 |

### 3.2 生词本掌握详情格式（vocabMasteryDetail）

```
- new（未学习）: abandon, phenomenon, elaborate
- learning（学习中）: consequently, preliminary
- review（复习中）: ubiquitous, paradigm
- mastered（已掌握）: approximately, significant
```

**使用策略：**
- `new` 和 `learning` 的词 → 优先使用，放在文章显眼位置
- `review` 的词 → 适度使用，巩固记忆
- `mastered` 的词 → 少用或不用（已掌握，不需要重复练习）

---

## 四、输出 JSON 格式

```json
{
  "title": "英文标题（简洁有吸引力）",
  "content": "英文正文（段落间用 \\n\\n 分隔）",
  "summaryZh": "中文摘要（50字以内）",
  "category": "tech/life/news/literature/science/business",
  "tags": ["英文标签1", "英文标签2", "英文标签3"],
  "highlightedVocab": [
    {
      "word": "重点单词",
      "definition": "中文释义",
      "phonetic": "/音标/"
    }
  ],
  "sentenceTranslations": [
    {
      "en": "英文句子（与正文逐句对应）",
      "zh": "中文翻译"
    }
  ],
  "grammarPoints": [
    {
      "title": "语法点名称（如 '定语从句'）",
      "explanation": "语法讲解（中文，简洁明了）",
      "example": "文中出现的例句（英文）"
    }
  ],
  "questions": [
    {
      "type": "multiple-choice",
      "text": "英文题目",
      "options": ["选项A", "选项B", "选项C", "选项D"],
      "answer": "正确选项的完整文本",
      "explanation": "中文解析（说明为什么选这个）"
    },
    {
      "type": "true-false",
      "text": "英文判断题",
      "options": [],
      "answer": "True 或 False",
      "explanation": "中文解析"
    },
    {
      "type": "fill-blank",
      "text": "英文句子，空格用 ____ 表示",
      "options": [],
      "answer": "填入的单词",
      "explanation": "中文解析"
    },
    {
      "type": "short-answer",
      "text": "英文简答题",
      "options": [],
      "answer": "参考答案（英文或中文均可）",
      "explanation": "中文解析"
    }
  ]
}
```

---

## 五、输出字段详细要求

### 5.1 title（标题）
- 英文，简洁有吸引力
- 能概括文章主题
- 长度 5-15 个单词

### 5.2 content（正文）
- 段落间用 `\n\n` 分隔
- 句子间用句号分隔
- 词数符合等级要求
- 生词自然融入，不刻意堆砌
- 内容连贯、有逻辑、有教育意义

### 5.3 summaryZh（中文摘要）
- 50 字以内
- 准确概括文章核心内容

### 5.4 tags（标签）
- 3-5 个英文标签
- 与文章主题相关
- 首字母小写，单词间用空格分隔
- 示例：["artificial intelligence", "technology", "future"]

### 5.5 highlightedVocab（重点词汇）
- 列出 5-10 个该难度等级的重点词汇
- 优先从用户生词本中选取
- 必须包含：word（原形）、definition（中文释义）、phonetic（国际音标）
- 其他难度等级的生词也可以列出

### 5.6 sentenceTranslations（句子翻译）
- **必须覆盖文章所有句子**（逐句翻译）
- en 字段必须与正文中的句子完全一致
- zh 字段为准确的中文翻译
- 翻译风格：准确 > 优美

### 5.7 grammarPoints（语法点）
- 列出 2-3 个文章中出现的语法点
- title：语法点名称（中文，如 "现在完成时"、"定语从句"）
- explanation：简要讲解（中文，100 字以内）
- example：文中出现的该语法点例句（英文原文）

### 5.8 questions（阅读理解题）
- 总数 3-5 道
- 题型分布要求：
  - 至少 2 道选择题（multiple-choice）
  - 至少 1 道判断题（true-false）
  - 其余可为填空题（fill-blank）或简答题（short-answer）
- 难度与文章等级匹配
- answer 字段必须是正确答案
- explanation 字段用中文解释解题思路

---

## 六、完整示例

### 输入示例

```
请为我生成一篇英语阅读文章，以下是我的学习信息：

## 基本要求
- **难度等级:** CET4
- **主题方向:** 远程办公对年轻人职业发展的影响
- **分类:** business

## 我的生词本
以下是我正在学习的单词，请尽量在文章中自然使用这些词（至少使用 5 个）：
flexible, commute, productivity, collaborate, boundary, isolation, discipline, virtual, efficient, distraction

## 生词本掌握情况
- new（未学习）: flexible, commute, productivity, collaborate, boundary
- learning（学习中）: isolation, discipline
- review（复习中）: virtual, efficient
- mastered（已掌握）: distraction

## 额外要求
希望文章能包含一些真实的数据或案例
```

### 输出示例

```json
{
  "title": "Remote Work: A Double-Edged Sword for Young Professionals",
  "content": "The rise of remote work has transformed how young professionals build their careers. What once seemed like a dream — working from the comfort of home — has revealed both remarkable benefits and unexpected challenges.\n\nOne of the most obvious advantages is the flexible schedule. Without the daily commute to the office, workers save an average of 40 minutes each day. This extra time can be used for exercise, learning new skills, or simply getting more sleep. Studies show that this flexibility often leads to higher productivity, as employees can work during their most energetic hours.\n\nHowever, remote work also brings significant challenges. The boundary between work and personal life becomes increasingly blurred when your living room doubles as your office. Many young workers report difficulty \"switching off\" after work hours, leading to burnout and stress.\n\nIsolation is another serious concern. In a traditional office, collaboration happens naturally — you can walk over to a colleague's desk for a quick discussion. In a virtual environment, every interaction requires deliberate effort. This lack of spontaneous communication can make young professionals feel disconnected from their teams.\n\nThe key to success in remote work lies in self-discipline. Workers who set clear schedules, create dedicated workspaces, and maintain regular communication with their teams tend to thrive. As one study from Stanford University found, remote workers who established firm boundaries were 13% more efficient than their office-bound counterparts.\n\nRemote work is not simply good or bad — it is a tool that requires skill to use effectively. For young professionals willing to develop the right habits, it offers unprecedented freedom and opportunity.",
  "summaryZh": "远程办公为年轻职场人带来灵活与高效，但也伴随着工作生活界限模糊和社交隔离的挑战，成功关键在于自律。",
  "category": "business",
  "tags": ["remote work", "career development", "productivity", "work-life balance"],
  "highlightedVocab": [
    {"word": "flexible", "definition": "灵活的", "phonetic": "/ˈfleksəbl/"},
    {"word": "commute", "definition": "通勤", "phonetic": "/kəˈmjuːt/"},
    {"word": "productivity", "definition": "生产力；效率", "phonetic": "/ˌprɒdʌkˈtɪvəti/"},
    {"word": "collaborate", "definition": "合作；协作", "phonetic": "/kəˈlæbəreɪt/"},
    {"word": "boundary", "definition": "边界；界限", "phonetic": "/ˈbaʊndri/"},
    {"word": "isolation", "definition": "隔离；孤立", "phonetic": "/ˌaɪsəˈleɪʃn/"},
    {"word": "discipline", "definition": "纪律；自律", "phonetic": "/ˈdɪsəplɪn/"},
    {"word": "virtual", "definition": "虚拟的", "phonetic": "/ˈvɜːtʃuəl/"},
    {"word": "efficient", "definition": "高效的", "phonetic": "/ɪˈfɪʃnt/"}
  ],
  "sentenceTranslations": [
    {"en": "The rise of remote work has transformed how young professionals build their careers.", "zh": "远程办公的兴起改变了年轻职场人建设职业的方式。"},
    {"en": "What once seemed like a dream — working from the comfort of home — has revealed both remarkable benefits and unexpected challenges.", "zh": "曾经看似梦想的事——在家舒适地工作——既展现了显著的好处，也带来了意想不到的挑战。"},
    {"en": "One of the most obvious advantages is the flexible schedule.", "zh": "最明显的优势之一是灵活的时间安排。"},
    {"en": "Without the daily commute to the office, workers save an average of 40 minutes each day.", "zh": "不用每天通勤去办公室，工作者平均每天节省40分钟。"},
    {"en": "This extra time can be used for exercise, learning new skills, or simply getting more sleep.", "zh": "这些额外的时间可以用于锻炼、学习新技能，或者只是多睡一会儿。"},
    {"en": "Studies show that this flexibility often leads to higher productivity, as employees can work during their most energetic hours.", "zh": "研究表明，这种灵活性通常能带来更高的生产力，因为员工可以在精力最充沛的时段工作。"},
    {"en": "However, remote work also brings significant challenges.", "zh": "然而，远程办公也带来了重大挑战。"},
    {"en": "The boundary between work and personal life becomes increasingly blurred when your living room doubles as your office.", "zh": "当你的客厅兼作办公室时，工作和个人生活之间的界限变得越来越模糊。"},
    {"en": "Many young workers report difficulty \"switching off\" after work hours, leading to burnout and stress.", "zh": "许多年轻工作者表示下班后很难"关机"，导致倦怠和压力。"},
    {"en": "Isolation is another serious concern.", "zh": "孤立是另一个严重的问题。"},
    {"en": "In a traditional office, collaboration happens naturally — you can walk over to a colleague's desk for a quick discussion.", "zh": "在传统办公室里，合作是自然发生的——你可以走到同事的桌前快速讨论。"},
    {"en": "In a virtual environment, every interaction requires deliberate effort.", "zh": "在虚拟环境中，每次互动都需要刻意努力。"},
    {"en": "This lack of spontaneous communication can make young professionals feel disconnected from their teams.", "zh": "这种缺乏自发沟通的情况会让年轻职场人感到与团队脱节。"},
    {"en": "The key to success in remote work lies in self-discipline.", "zh": "远程办公成功的关键在于自律。"},
    {"en": "Workers who set clear schedules, create dedicated workspaces, and maintain regular communication with their teams tend to thrive.", "zh": "制定明确时间表、创建专用工作空间并与团队保持定期沟通的工作者往往能蓬勃发展。"},
    {"en": "As one study from Stanford University found, remote workers who established firm boundaries were 13% more efficient than their office-bound counterparts.", "zh": "正如斯坦福大学的一项研究发现，建立了明确界限的远程工作者比坐办公室的同行效率高出13%。"},
    {"en": "Remote work is not simply good or bad — it is a tool that requires skill to use effectively.", "zh": "远程办公不是简单的好或坏——它是一种需要技巧才能有效使用的工具。"},
    {"en": "For young professionals willing to develop the right habits, it offers unprecedented freedom and opportunity.", "zh": "对于愿意培养正确习惯的年轻职场人来说，它提供了前所未有的自由和机会。"}
  ],
  "grammarPoints": [
    {
      "title": "定语从句",
      "explanation": "用 who/which/that 等关系代词引导的从句，修饰名词。本文中多次出现，如 Workers who set clear schedules... 修饰 workers。",
      "example": "Workers who set clear schedules, create dedicated workspaces, and maintain regular communication with their teams tend to thrive."
    },
    {
      "title": "比较级结构",
      "explanation": "用 more + adj + than 或 -er + than 表示两者比较。本文中 more efficient than 是典型用法。",
      "example": "Remote workers who established firm boundaries were 13% more efficient than their office-bound counterparts."
    },
    {
      "title": "动名词作主语",
      "explanation": "动词的 -ing 形式可以作为句子的主语。本文中 Working from home 是动名词短语作主语。",
      "example": "Working from the comfort of home has revealed both remarkable benefits and unexpected challenges."
    }
  ],
  "questions": [
    {
      "type": "multiple-choice",
      "text": "According to the article, how much time do remote workers save daily by not commuting?",
      "options": ["20 minutes", "30 minutes", "40 minutes", "60 minutes"],
      "answer": "40 minutes",
      "explanation": "文章第三段明确提到 'Without the daily commute to the office, workers save an average of 40 minutes each day.'"
    },
    {
      "type": "multiple-choice",
      "text": "What is the main challenge of remote work mentioned in the article?",
      "options": ["Higher internet costs", "Blurred work-life boundaries", "Lack of office equipment", "Lower salary"],
      "answer": "Blurred work-life boundaries",
      "explanation": "文章第四段指出，当客厅兼作办公室时，工作和个人生活之间的界限变得越来越模糊，这是远程办公的主要挑战。"
    },
    {
      "type": "true-false",
      "text": "According to the Stanford study, remote workers are 13% less efficient than office workers.",
      "options": [],
      "answer": "False",
      "explanation": "文章第七段说的是建立了明确界限的远程工作者比坐办公室的同行效率高出13%（more efficient），而非更低。"
    },
    {
      "type": "fill-blank",
      "text": "The key to success in remote work lies in self-______.",
      "options": [],
      "answer": "discipline",
      "explanation": "文章第七段明确指出 'The key to success in remote work lies in self-discipline.'"
    },
    {
      "type": "short-answer",
      "text": "What three habits does the article suggest for successful remote work?",
      "options": [],
      "answer": "Setting clear schedules, creating dedicated workspaces, and maintaining regular communication with teams.",
      "explanation": "文章第七段提到这三个习惯是远程办公成功的关键。"
    }
  ]
}
```

---

## 七、质量检查清单

生成完成后，AI 应自行检查以下项目：

- [ ] 文章词数在等级要求范围内
- [ ] 生词本中的单词至少使用了指定数量
- [ ] 所有 sentenceTranslations 的 en 与正文句子完全一致
- [ ] questions 的 answer 确实是正确答案
- [ ] highlightedVocab 的音标和释义准确
- [ ] grammarPoints 确实出现在文章中
- [ ] tags 与文章主题相关
- [ ] JSON 格式合法，可被解析

---

## 八、调用示例（Node.js）

```javascript
const ai = require('../src/services/ai');
const VocabProgress = require('../src/models/VocabProgress');

async function generateArticleForUser(userId, topic, difficulty, category) {
  // 1. 获取用户生词本
  const vocabList = await VocabProgress.find({ userId })
    .select('word definition phonetic masteryLevel')
    .sort({ masteryLevel: 1, nextReview: 1 }); // new 优先

  // 2. 按掌握程度分组
  const grouped = {
    new: [], learning: [], review: [], mastered: []
  };
  vocabList.forEach(v => grouped[v.masteryLevel].push(v.word));

  // 3. 构建提示词
  const vocabWords = vocabList.map(v => v.word);
  const masteryDetail = Object.entries(grouped)
    .filter(([, words]) => words.length > 0)
    .map(([level, words]) => `- ${level}: ${words.join(', ')}`)
    .join('\n');

  // 4. 调用 AI 生成
  const result = await ai.generateArticle(topic, difficulty, {
    vocabWords,
    category,
  });

  return result;
}
```

---

*本文档定义了英语阅读网站 AI 文章生成的完整提示词标准，涵盖输入参数、输出格式、质量要求等全部细节。*
