# 英语阅读网站 · 语法板块数据库规则与数据规范 (v3.0.4)

本文档定义了「英语阅读网站」语法库的数据结构规范、校验规则和导入数据样例，以便制作与维护语法数据库。

---

## 1. 数据结构总览 (Schema)

语法板块在 MongoDB 中对应 `Grammar` 集合 (Collection)，由主文档与两个内嵌子文档列表（**例句列表** `examples` 与 **配套练习列表** `exercises`）以及**相关语法关联**组成。

### 1.1 主文档字段说明 (`Grammar`)

| 字段名 | 数据类型 | 必须 (Required) | 默认值 / 校验规则 | 描述说明 |
| :--- | :--- | :---: | :--- | :--- |
| **_id** | ObjectId | 自动生成 | MongoDB 唯一主键 | 语法文档的唯一标识 |
| **title** | String | **是** | 自动去除首尾空格 (`trim: true`) | 语法点名称（例如：“虚拟语气”、“定语从句”） |
| **level** | String | **是** | 枚举值校验 (见下文 1.2) | 适用的英语难度分级 |
| **category** | String | **是** | 枚举值校验 (见下文 1.3) | 语法所属的分类类别 |
| **explanation** | String | **是** | - | 语法的核心中文详细解析，支持 Markdown 格式 |
| **examples** | Array | 否 | 默认为空数组 `[]` | 精选的典型英文例句及中文对照翻译，结构见 1.4 |
| **exercises** | Array | 否 | 默认为空数组 `[]` | 针对该语法点设计的测验练习题，结构见 1.5 |
| **relatedGrammar**| Array | 否 | 默认为空数组 `[]` | 关联的其他语法点 ID 数组，引用 `Grammar` 集合的 ObjectId |
| **createdAt** | Date | 自动生成 | 启用 `timestamps` 自动生成 | 记录创建时间 |
| **updatedAt** | Date | 自动生成 | 启用 `timestamps` 自动生成 | 记录最后更新时间 |

---

## 2. 字段枚举值限制 (Validation Enums)

数据库中部分字段严格限制了取值范围，在录入数据时必须精确匹配：

### 2.1 难度等级 (`level`)
限定以下 6 个等级（必须使用完全相同的字符串）：
* `'初中'`
* `'高中'`
* `'CET4'`
* `'CET6'`
* `'考研'`
* `'雅思'`

### 2.2 语法分类 (`category`)
限定以下 7 种分类（英文小写字符串）：
* `'tense'` — 时态与语态（例如：一般现在时、过去完成时）
* `'clause'` — 从句（例如：定语从句、名词性从句、状语从句）
* `'voice'` — 被动语态等
* `'mood'` — 语气（例如：虚拟语气、祈使句）
* `'agreement'` — 一致性（例如：主谓一致、代词指代一致）
* `'punctuation'` — 标点符号规则与规范
* `'other'` — 其他复杂句式或语法现象（如：强调句、倒装句）

---

## 3. 子文档详细规范

### 3.1 例句规范 (`grammarExampleSchema`)
每个语法文档包含 0 个或多个典型例句。由于是内嵌文档且不需要被独立查询，设置了 `{ _id: false }`（不自动生成子文档 ID）。

| 子字段名 | 数据类型 | 必须 | 默认值 | 描述说明 |
| :--- | :--- | :---: | :--- | :--- |
| **sentence** | String | **是** | - | 地道完整的英文例句原文 |
| **translation** | String | 否 | `''`（空字符串） | 例句的中文对照翻译 |
| **highlight** | String | 否 | `''`（空字符串） | 例句中需要加粗或高亮显示的特定单词/短语（必须是 sentence 中的子串） |

### 3.2 练习题规范 (`grammarExerciseSchema`)
每个语法文档提供针对性的课后配套练习，支持 4 种题型。同样不生成子文档 ID (`{ _id: false }`)。

| 子字段名 | 数据类型 | 必须 | 默认值 | 描述说明 |
| :--- | :--- | :---: | :--- | :--- |
| **type** | String | **是** | 枚举值校验 (见下文) | 题目题型类型。限定：`'multiple-choice'` (单选题), `'fill-blank'` (填空题), `'true-false'` (判断题), `'short-answer'` (简答题) |
| **text** | String | **是** | - | 题干内容（英文），例如："I wish I ___ a bird. (be)" |
| **options** | Array[String]| 否 | `[]` | 备选答案选项。仅当 `type` 为 `'multiple-choice'` 时才需填写，通常为 4 个选项。其他题型可为空 |
| **answer** | String | **是** | - | 正确答案文本。注意：如果是单选题，必须与 options 中的某一项文本**完全一致**；如果是判断题，通常填写 `"True"` 或 `"False"` |
| **explanation** | String | 否 | `''`（空字符串） | 题目的中文解析与答题技巧说明 |

---

## 4. 数据库索引设计 (Indexes)

为了确保在前台进行检索和分页时的查询性能，数据库对以下字段建立了复合索引：
* **复合索引：** `{ level: 1, category: 1 }`
* **应用场景：** 当用户在前端点击特定分级（如“考研”）下的特定分类（如“从句”）时，数据库可以利用索引实现毫秒级快速定位。

---

## 5. 标准 JSON 导入数据样例

在录入或者使用自动化脚本向 `Grammar` 集合中批量导入数据时，可直接使用以下符合 Mongoose 校验规则 of JSON 对象作为参考模板：

```json
{
  "title": "定语从句 (Attributive Clause)",
  "level": "高中",
  "category": "clause",
  "explanation": "### 1. 什么是定语从句？\n在复合句中，修饰名词或代词的从句叫做定语从句。被修饰的名词或代词被称为**先行词**，引导定语从句的词称为**关系词**。\n\n### 2. 关系代词与关系副词的区分\n* **关系代词** (who, whom, whose, that, which) 在从句中充当主语、宾语、表语或定语。\n* **关系副词** (when, where, why) 在从句中充当状语。",
  "examples": [
    {
      "sentence": "The girl who is singing next door is my sister.",
      "translation": "在隔壁唱歌的那个女孩是我的妹妹。",
      "highlight": "who is singing next door"
    },
    {
      "sentence": "This is the library where I study every weekend.",
      "translation": "这就是我每个周末学习的图书馆。",
      "highlight": "where I study every weekend"
    }
  ],
  "exercises": [
    {
      "type": "multiple-choice",
      "text": "The house _______ window is broken has been abandoned for years.",
      "options": [
        "which",
        "whose",
        "that",
        "where"
      ],
      "answer": "whose",
      "explanation": "先行词为 The house，空后修饰名词 window。whose 在从句中充当定语，表示“……的窗户”，符合题意。"
    },
    {
      "type": "true-false",
      "text": "In the sentence 'I still remember the day when we first met.', 'when' is a relative adverb acting as an adverbial of time.",
      "options": [
        "True",
        "False"
      ],
      "answer": "True",
      "explanation": "先行词是 the day，在从句中关系副词 when 充当时间状语，句意正确。"
    }
  ]
}
```

---

## 6. 数据质量校验规范

制作语法数据库时，建议通过前置脚本或人工核对机制确保数据完全符合以下逻辑：
1. **选项一致性校验**：如果是 `multiple-choice`（单选题），`answer` 的字符串值必须在 `options` 数组中**有且仅有一个**完全一致的元素。
2. **高亮匹配校验**：在 `examples` 数组中，如果指定了 `highlight`，则 `highlight` 的内容必须能够完整在 `sentence` 语句中检索到。
3. **关联语法关系**：`relatedGrammar` 中的每个 ID 必须在数据库中确实存在，推荐在录入完所有语法文档后，通过第二阶段更新脚本填充关系 ID。
