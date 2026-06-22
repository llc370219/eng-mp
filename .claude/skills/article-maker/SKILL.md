---
name: article-maker
description: 为「英语阅读网站(eng-mp)」批量制作分级精读文章，生成含正文/逐句翻译/语法/生词/测验的完整结构，打包成 zip 压缩包。两步走：先生成预览经用户确认，再打包；后台导入默认存为草稿，人工确认后才发布推送。当用户说「做文章/出一篇文章/生成阅读文章/article-maker/打包文章」时触发。
---

# article-maker · 文章制作打包 Skill

把一篇/多篇英语精读文章做成符合本项目格式的 **zip 压缩包**。生成由 Claude（运行本 skill 时）直接完成，**无需 API Key**。

> ⚠️ **两步走，绝不直接发布**：
> 1. **生成 + 确认**：先生成文章并向用户展示预览摘要，**等用户确认 OK 后**才写文件打包。
> 2. **导入 + 发布**：后台导入文章包**默认存为「草稿(未发布)」**，由用户在列表逐篇预览确认后手动点「发布」才推送上线。

## 一、流程总览

1. 收集输入（主题、难度、分类、字数、可选生词/要求）
2. 按下方规范生成**完整结构化文章**（覆盖阅读页全部功能）
3. **【第 1 步·确认】向用户展示每篇的预览摘要（标题/难度/分类/字数/生词数/题数 + 正文首段），询问「确认打包吗？」——未确认不要写文件、不要打包**
4. 用户确认后：写入 `articles.json`（数组，可含多篇）并打包成 zip
5. 告诉用户 zip 路径 +**【第 2 步·发布】**后台导入（默认草稿）→ 预览 → 确认发布 的步骤

## 二、收集输入

用户可能在一句话里给全，否则逐项确认（给默认值）：

| 输入 | 说明 | 默认 |
|------|------|------|
| 主题 topic | 文章写什么（可多个 → 多篇） | 必填 |
| 难度 level | `初中/高中/CET4/CET6/考研/雅思` | 高中 |
| 分类 category | `tech/life/news/literature/science/business` | life |
| 字数 wordCount | 目标词数 | 按难度：初中150·高中250·CET4 300·CET6 400·考研500·雅思550 |
| 生词 vocab | 需自然融入正文的单词（可选） | 无 |
| 额外要求 | 风格/题材等（可选） | 无 |

## 三、生成规范（务必全部产出）

每篇文章是一个 JSON 对象，**字段必须齐全**（这是阅读页所有功能的数据来源）：

```json
{
  "title": "英文标题（5-15词，简洁有吸引力）",
  "content": "英文正文，段落之间用 \n\n 分隔",
  "summaryZh": "中文摘要（50字以内）",
  "difficulty": "初中|高中|CET4|CET6|考研|雅思",
  "category": "tech|life|news|literature|science|business",
  "tags": ["英文标签", "3-5个"],
  "highlightedVocab": [
    {"word": "原形", "definition": "中文释义", "phonetic": "/国际音标/"}
  ],
  "sentenceTranslations": [
    {"en": "正文里的英文句子（逐句、与正文完全一致）", "zh": "中文翻译"}
  ],
  "grammarPoints": [
    {"title": "语法点名称(中文)", "explanation": "讲解(中文,100字内)", "example": "文中英文例句"}
  ],
  "questions": [
    {"type": "multiple-choice", "text": "英文题干", "options": ["A","B","C","D"], "answer": "正确选项完整文本", "explanation": "中文解析"},
    {"type": "true-false", "text": "英文陈述", "options": ["True","False"], "answer": "True", "explanation": "中文解析"}
  ]
}
```

### 难度对照（控制词汇与句式）
- 初中：简单句为主，词汇 ≤1000，时态限一般现在/过去/将来
- 高中：复合句（定语/状语从句），词汇 ≤2500，常见时态+被动
- CET4：较复杂句式，词汇 ≤4500，可用虚拟/倒装/强调
- CET6：高级句式+学术词汇，词汇 ≤6000
- 考研：长难句，学术词汇 ≤5500，逻辑严密的议论文/说明文
- 雅思：学术英语，复杂句式，高级词汇

### 硬性要求（最容易出错，务必检查）
1. **sentenceTranslations 必须覆盖正文每一句**，且 `en` 与正文中的句子**逐字一致**（含标点）。阅读页靠 `en` 精确匹配来显示译文，不一致就不显示。
   - 切句规则与项目一致：按 `. ! ?` 断句；正文段落按 `\n\n` 分。生成后请逐句核对。
2. **highlightedVocab**：5-10 个重点词；若用户给了生词，**优先包含并自然融入正文**，每个带音标+中文释义。
3. **grammarPoints**：2-3 个文中真实出现的语法点，example 用文中原句。
4. **questions**：3-5 道，至少 2 选择题 + 1 判断题，answer 必须正确。
5. 正文/标题/题干用英文；释义/翻译/解析用中文。

## 四、写文件 + 打包（**仅在用户确认后执行**）

先按「三」生成内容并向用户展示预览摘要等待确认；**用户明确同意后**，再把一篇或多篇放进数组写入 `articles.json` 并打包。建议输出到项目下 `article-packages/`：

```bash
mkdir -p /Users/ll/Documents/eng-mp/article-packages
cd /Users/ll/Documents/eng-mp/article-packages
# （用 Write 工具把 JSON 写到 articles.json 后）
STAMP=$(date +%Y%m%d-%H%M%S)
zip -j "articles-$STAMP.zip" articles.json
echo "✅ 文章包已生成: $(pwd)/articles-$STAMP.zip"
```
> 用 Write 工具写 `articles.json`（内容是 JSON 数组），再执行上面的 `zip`。`zip -j` 去掉目录层级，确保包内是 `articles.json`。

## 五、告诉用户如何发布（两步确认，不直接上线）

> 文章包已生成：`article-packages/articles-<时间>.zip`
> **第 1 步 · 导入为草稿**：管理后台 → **文章管理** → **📦 导入文章包** → 选该 zip → 点「**导入为草稿**」（默认不勾「跳过审核，导入即发布」）。
> **第 2 步 · 审核后发布**：在下方文章列表逐篇预览，确认无误后点该文章的「**发布**」按钮，才推送到用户端「推送精选」。
> 导入会自动建好文章 + 配套习题；发布后用户端可见，点开含逐句翻译/点词查词/语法/测验。

## 六、自检清单（打包前过一遍）
- [ ] 每篇字段齐全（title/content/summaryZh/difficulty/category/tags/highlightedVocab/sentenceTranslations/grammarPoints/questions）
- [ ] difficulty 是 6 个合法值之一；category 是 6 个合法值之一
- [ ] sentenceTranslations 覆盖每一句且 en 与正文一致
- [ ] 用户给的生词已融入并出现在 highlightedVocab
- [ ] questions answer 正确、options 完整
- [ ] articles.json 是合法 JSON 数组；zip 内含 articles.json
