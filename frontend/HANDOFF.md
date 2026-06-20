# Lull · 听简 — 前端交接文档 (Handoff)

英语分级阅读学习网站的**用户端前端**。配合后端仓库 `llc370219/eng-mp`（Node.js + Express 5 + MongoDB + EJS）使用。

---

## 1. 这是什么 / 技术形态

- 单文件**交互原型**：`Lull-Reading.dc.html`，内含全部 12 个用户端页面，靠内部状态切换、相互可点。
- 它是一个 **Design Component（DC）**：纯 HTML + 内联样式 + 一个 JS 逻辑类，运行时由 `support.js` 渲染（基于 React，无需打包）。
- 子组件 `Flower.dc.html`（装饰花朵）通过 `dc-import` 引入。
- **所有数据目前是写死的样例数据**（在逻辑类里），用于演示视觉与交互。对接后端时把这些替换成真实接口数据即可（见第 4 节）。

### 文件清单
```
frontend/
├── Lull-Reading.dc.html   # 主文件：12 个页面 + 全部逻辑与样例数据
├── Flower.dc.html         # 花朵装饰子组件（props: petal/center/size）
├── support.js             # DC 运行时（勿改）
├── DESIGN_SPEC.md         # 设计规范（色彩/字体/组件）
├── HANDOFF.md             # 本文档
└── README.md              # 快速开始
```

---

## 2. 本地运行

DC 用 `fetch` 加载子组件，**不能直接双击 `file://` 打开**，需起一个静态服务器：

```bash
cd frontend
python3 -m http.server 5173
# 浏览器打开 http://localhost:5173/Lull-Reading.dc.html
```
（或 `npx serve`、VS Code Live Server 等任意静态服务器。需联网以加载 Google Fonts。）

---

## 3. 页面清单 ↔ 后端路由对照

| 页面（内部 screen） | 后端路由 | 关键数据 |
|------|------|------|
| 登录 / 注册 | `GET/POST /demo/login`、`/demo/register`、`/demo/send-code` | 邮箱 + 密码 + 验证码 + 邀请码 |
| 文章列表（首页） | `GET /demo/?difficulty=&category=` | `Article`（标题/难度/分类/词数/时长/摘要） |
| 文章精读 | `GET /demo/article/:id` | `article` + `exercise` + 用户生词高亮 `vocabWords` + `sentenceHighlight` |
| — 提交测验 | `POST /demo/article/:id/submit` | 自动判分 + 自动打卡 |
| — 文内 AI | `POST /demo/article/:id/ai` (task: summarize/translate/quiz) | |
| 词典查词 | `GET /demo/dict?word=&sentence=` | `Dictionary` 或外部词典 API + 整句 AI 翻译 |
| — 加入生词 | `POST /demo/vocab/add` | |
| 生词本 | `GET /demo/vocab` | `VocabProgress` + 掌握度统计 |
| 单词复习（卡片） | `GET /demo/vocab/review` → `POST /demo/vocab/review/:id` | SM-2，`quality` 0–5 |
| 语法库 | `GET /demo/grammar?level=&category=` | `Grammar` |
| 语法详情 | `GET /demo/grammar/:id` → `POST /demo/grammar/:id/submit` | 例句 + 练习判分 |
| 打卡 | `GET /demo/checkin` → `POST /demo/checkin` | streak / 日历 / 完成率 |
| 学习统计（含雷达） | `GET /demo/stats` | 见第 4 节雷达数据 |
| AI 助手 | `GET /demo/ai` → `POST /demo/ai/{summarize,analyze,quiz,history}` | 选文章或粘贴文本 |
| 设置 | `GET/POST /demo/settings` | `sentenceHighlight` / `dailyGoalMin` |

---

## 4. 样例数据在哪、怎么接真实接口

主文件逻辑类 `class Component extends DCLogic` 顶部集中放着所有样例数据，**改这里即可**：

| 常量 | 对应后端 Model | 字段提示 |
|------|------|------|
| `ARTICLES` | `Article` | id/title/difficulty(A1–C2)/cat/summaryZh/wordCount/readingTimeMin |
| `PARAS` + `WORD_DEFS` | `Article.content` / `highlightedVocab` | 文章按「段→句→片段」结构，片段标记生词；点词查义 |
| `QUIZ` | `Exercise.questions` | text/options/answer |
| `VOCAB` | `VocabProgress` | word/phon/def/mastery/due |
| `GRAMMARS` + `GRAMMAR_DETAIL` | `Grammar` | level/cat/explanation/examples/exercises |
| `WEEK_TREND` | `/demo/stats` 7 天趋势 | 每日新增生词数 |
| `statCards` / `streak` / `checkinCal` | `/demo/stats`、`CheckIn` | 总量/已掌握/读完/正确率/打卡 |

**雷达图 5 维**（`renderVals` 内 `dims`）建议由 `/demo/stats` 派生：

| 维度 | 建议算法 |
|------|------|
| 阅读 | 读完文章数 / 目标，封顶 100 |
| 词汇 | 已掌握词 / 生词总量 × 100 |
| 语法 | 语法练习平均正确率 |
| 坚持 | 近 30 天打卡天数 / 30 × 100 |
| 准确 | 读后测验平均正确率（`avgScore`） |

**对接方式**：把写死的常量换成 `componentDidMount` 里的 `fetch('/demo/...')`（后端可加 `?format=json` 或单独 API 路由返回 JSON），再 `setState`。`renderVals()` 已把数据与 UI 解耦，改数据源不动模板。

---

## 5. 改设计 / 二次开发

- 文案、颜色、单个文字：直接在编辑器里点选元素改即可。
- 结构 / 逻辑：模板（标签）与逻辑类（`renderVals` 返回值）分离；交互态都在 `state` 里。
- 主题开关：根组件 props `showFlowers`、`primaryAccent`（见 DESIGN_SPEC）。
- 视觉规范：严格遵循 `DESIGN_SPEC.md`（描边 2.5px + 硬投影 + 撞色只用于外壳）。

---

## 6. 已知约束

- 需联网加载 Google Fonts（Shrikhand / Space Grotesk / Newsreader）；离线可自托管字体后改 `<link>`。
- 入场「逐帧生长」类一次性 CSS 动画在该运行时会被高频重渲染打断，已改为可靠的静态终态 / 交互式呈现。
- 当前是纯前端原型，登录态 / 路由 / 表单提交均为前端演示，未接后端鉴权。
