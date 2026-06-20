#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Grammar = require('../src/models/Grammar');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eng-reader';

const GRAMMAR = [
  // ===== 时态 (tense) =====
  { title: '一般现在时 (Simple Present)', level: 'A1', category: 'tense',
    explanation: '## 一般现在时表示经常发生的动作、客观事实或习惯性行为。\n\n**构成:** 肯定句: 主语 + 动词原形（第三人称单数加 -s/-es）\n否定句: 主语 + do/does + not + 动词原形\n疑问句: Do/Does + 主语 + 动词原形？\n\n**用法:**\n1. 习惯性动作: I go to school every day.\n2. 客观事实: The sun rises in the east.\n3. 现在的状态: She works as a teacher.',
    examples: [{sentence:'I play tennis every weekend.',translation:'我每个周末打网球。',highlight:'play'},{sentence:'She speaks three languages.',translation:'她说三种语言。',highlight:'speaks'},{sentence:'Do you like coffee?',translation:'你喜欢咖啡吗？',highlight:'Do...like'}],
    exercises: [{type:'fill-blank',text:'She ___ (go) to work by bus every day.',answer:'goes',explanation:'第三人称单数，go 加 -es'},{type:'multiple-choice',text:'The earth ___ around the sun.',options:['revolve','revolves','revolving','revolved'],answer:'revolves',explanation:'客观事实用一般现在时，第三人称单数'},{type:'fill-blank',text:'They ___ (not eat) meat.',answer:'do not eat',explanation:'否定句用 do not + 动词原形'}] },
  { title: '一般过去时 (Simple Past)', level: 'A1', category: 'tense',
    explanation: '## 一般过去时表示过去发生的动作或存在的状态。\n\n**构成:** 肯定句: 主语 + 动词过去式\n否定句: 主语 + did not + 动词原形\n疑问句: Did + 主语 + 动词原形？\n\n**规则变化:**\n- 一般加 -ed: worked, played\n- 以 e 结尾加 -d: lived, hoped\n- 辅音+y 结尾，变 y 为 i 加 -ed: studied\n- 重读闭音节双写末字母加 -ed: stopped',
    examples: [{sentence:'I visited my grandparents last weekend.',translation:'上周末我去看望了祖父母。',highlight:'visited'},{sentence:'She didn\'t go to school yesterday.',translation:'她昨天没去上学。',highlight:'didn\'t go'},{sentence:'Did you finish your homework?',translation:'你做完作业了吗？',highlight:'Did...finish'}],
    exercises: [{type:'fill-blank',text:'I ___ (watch) a movie last night.',answer:'watched',explanation:'watch 加 -ed'},{type:'fill-blank',text:'She ___ (not be) at home yesterday.',answer:'was not',explanation:'be 动词过去式否定'},{type:'multiple-choice',text:'___ you ___ to the party?',options:['Did...go','Do...go','Did...went','Were...go'],answer:'Did...go',explanation:'疑问句用 Did + 动词原形'}] },
  { title: '一般将来时 (Simple Future)', level: 'A2', category: 'tense',
    explanation: '## 一般将来时表示将要发生的动作或计划。\n\n**两种形式:**\n1. will + 动词原形: 表示临时决定或预测\n2. be going to + 动词原形: 表示已有计划或打算\n\n**区别:**\n- will: I think it will rain. (预测)\n- going to: I\'m going to visit Paris next month. (计划)',
    examples: [{sentence:'I will help you with your homework.',translation:'我会帮你做作业。',highlight:'will help'},{sentence:'She is going to study medicine.',translation:'她打算学医。',highlight:'is going to study'},{sentence:'It will be sunny tomorrow.',translation:'明天会是晴天。',highlight:'will be'}],
    exercises: [{type:'fill-blank',text:'I ___ (call) you later.',answer:'will call',explanation:'临时决定用 will'},{type:'fill-blank',text:'They ___ (move) to Beijing next year. (已有计划)',answer:'are going to move',explanation:'已有计划用 be going to'},{type:'multiple-choice',text:'Look at the clouds! It ___ rain.',options:['will','is going to','is','was'],answer:'is going to',explanation:'根据迹象预测用 be going to'}] },
  { title: '现在进行时 (Present Continuous)', level: 'A2', category: 'tense',
    explanation: '## 现在进行时表示此刻正在进行的动作。\n\n**构成:** 主语 + am/is/are + 动词-ing\n\n**用法:**\n1. 此刻正在进行: I am reading a book now.\n2. 近期安排: We are leaving tomorrow.\n3. 临时状态: She is living with her friend.\n\n**不能用进行时的动词:**\n状态动词: know, like, love, want, need, believe, understand',
    examples: [{sentence:'She is cooking dinner right now.',highlight:'is cooking',translation:'她现在正在做晚饭。'},{sentence:'We are studying for the exam this week.',highlight:'are studying',translation:'我们这周在准备考试。'},{sentence:'I understand the problem.',highlight:'understand',translation:'我理解这个问题。（状态动词，不用进行时）'}],
    exercises: [{type:'fill-blank',text:'Look! The baby ___ (sleep).',answer:'is sleeping',explanation:'此刻正在进行用现在进行时'},{type:'fill-blank',text:'She ___ (not/watch) TV now.',answer:'is not watching',explanation:'现在进行时否定'},{type:'multiple-choice',text:'I ___ (know) the answer.',options:['am knowing','know','knew','knows'],answer:'know',explanation:'know 是状态动词，不用进行时'}] },
  { title: '过去进行时 (Past Continuous)', level: 'B1', category: 'tense',
    explanation: '## 过去进行时表示过去某时刻正在进行的动作。\n\n**构成:** 主语 + was/were + 动词-ing\n\n**用法:**\n1. 过去某时刻正在进行: I was reading at 8 pm last night.\n2. 与一般过去时连用: While I was cooking, the phone rang.\n3. 两个同时进行的动作: While she was singing, he was playing guitar.',
    examples: [{sentence:'I was watching TV when you called.',translation:'你打电话时我正在看电视。',highlight:'was watching'},{sentence:'While it was raining, we stayed inside.',translation:'下雨的时候我们待在室内。',highlight:'was raining'},{sentence:'At 3 pm yesterday, she was working.',translation:'昨天下午3点她正在工作。',highlight:'was working'}],
    exercises: [{type:'fill-blank',text:'I ___ (walk) to school when I saw the accident.',answer:'was walking',explanation:'过去正在进行的背景动作'},{type:'fill-blank',text:'They ___ (not/listen) to music at that time.',answer:'were not listening',explanation:'过去进行时否定'},{type:'multiple-choice',text:'While she ___, the doorbell rang.',options:['slept','was sleeping','is sleeping','sleeps'],answer:'was sleeping',explanation:'while 后用过去进行时'}] },
  { title: '现在完成时 (Present Perfect)', level: 'B1', category: 'tense',
    explanation: '## 现在完成时表示过去发生的动作对现在有影响，或从过去持续到现在的状态。\n\n**构成:** 主语 + have/has + 过去分词\n\n**用法:**\n1. 过去发生但对现在有影响: I have lost my key. (现在没钥匙)\n2. 从过去持续到现在: She has lived here for ten years.\n3. 与 already, yet, just, ever, never 连用',
    examples: [{sentence:'I have already finished my homework.',translation:'我已经做完作业了。',highlight:'have...finished'},{sentence:'She has never been to Japan.',translation:'她从未去过日本。',highlight:'has never been'},{sentence:'Have you ever seen this movie?',translation:'你看过这部电影吗？',highlight:'Have...seen'}],
    exercises: [{type:'fill-blank',text:'I ___ (see) that movie three times.',answer:'have seen',explanation:'表示到目前为止的经历'},{type:'fill-blank',text:'She ___ here since 2020.',answer:'has lived',explanation:'since + 时间点，用现在完成时'},{type:'multiple-choice',text:'___ you ___ your work yet?',options:['Did...finish','Have...finished','Do...finish','Are...finishing'],answer:'Have...finished',explanation:'yet 用于现在完成时'}] },
  { title: '过去完成时 (Past Perfect)', level: 'B2', category: 'tense',
    explanation: '## 过去完成时表示"过去的过去"——在过去某动作之前已完成的动作。\n\n**构成:** 主语 + had + 过去分词\n\n**用法:**\n1. 过去某时之前已完成: When I arrived, she had already left.\n2. 过去两个动作的先后: After he had eaten, he went out.\n3. 与 by the time 连用: By the time I got there, the train had left.',
    examples: [{sentence:'When I arrived, the movie had already started.',translation:'我到的时候电影已经开始了。',highlight:'had...started'},{sentence:'She had never seen snow before she moved to Canada.',translation:'她搬到加拿大之前从未见过雪。',highlight:'had never seen'},{sentence:'By 2020, he had worked there for 10 years.',translation:'到2020年，他已经在那里工作了10年。',highlight:'had worked'}],
    exercises: [{type:'fill-blank',text:'When I arrived, she ___ (leave) already.',answer:'had left',explanation:'过去的过去用过去完成时'},{type:'fill-blank',text:'He ___ (not/finish) the work before the deadline.',answer:'had not finished',explanation:'过去完成时否定'},{type:'multiple-choice',text:'After she ___ (eat), she went to bed.',options:['ate','had eaten','has eaten','eats'],answer:'had eaten',explanation:'after 从句中先发生的动作用过去完成时'}] },
  { title: '现在完成进行时 (Present Perfect Continuous)', level: 'B2', category: 'tense',
    explanation: '## 现在完成进行时表示从过去开始一直持续到现在的动作，强调持续性。\n\n**构成:** 主语 + have/has been + 动词-ing\n\n**与现在完成时的区别:**\n- 现在完成时: I have read 3 books. (强调结果)\n- 现在完成进行时: I have been reading for 2 hours. (强调持续)',
    examples: [{sentence:'I have been waiting for you for two hours.',translation:'我已经等了你两个小时了。',highlight:'have been waiting'},{sentence:'It has been raining all day.',translation:'雨下了一整天了。',highlight:'has been raining'},{sentence:'She has been studying English since 2018.',translation:'她从2018年一直在学英语。',highlight:'has been studying'}],
    exercises: [{type:'fill-blank',text:'I ___ (work) on this project all morning.',answer:'have been working',explanation:'强调持续进行'},{type:'fill-blank',text:'She ___ (learn) French for three years.',answer:'has been learning',explanation:'for + 时间段，持续动作'},{type:'multiple-choice',text:'They ___ (wait) since 9 o\'clock.',options:['waited','have waited','have been waiting','are waiting'],answer:'have been waiting',explanation:'since + 过去时间，持续到现在'}] },

  // ===== 从句 (clause) =====
  { title: '定语从句 (Relative Clauses)', level: 'B1', category: 'clause',
    explanation: '## 定语从句用来修饰名词或代词。\n\n**关系代词:**\n- who/whom: 指人\n- which: 指物\n- that: 指人或物（限制性）\n- whose: 所有关系\n\n**关系副词:**\n- where: 地点\n- when: 时间\n- why: 原因\n\n**限制性 vs 非限制性:**\n- 限制性: 不加逗号，不可缺少\n- 非限制性: 加逗号，补充信息',
    examples: [{sentence:'The man who lives next door is a doctor.',translation:'住在隔壁的那个人是医生。',highlight:'who lives next door'},{sentence:'The book which I borrowed was interesting.',translation:'我借的那本书很有趣。',highlight:'which I borrowed'},{sentence:'My brother, who is a teacher, lives in Beijing.',translation:'我哥哥是老师，他住在北京。',highlight:'who is a teacher'}],
    exercises: [{type:'multiple-choice',text:'The girl ___ won the prize is my classmate.',options:['which','who','whose','whom'],answer:'who',explanation:'先行词是人，用 who'},{type:'fill-blank',text:'This is the house ___ I was born.',answer:'where',explanation:'修饰地点用 where'},{type:'multiple-choice',text:'The movie ___ we watched last night was great.',options:['who','where','that','whose'],answer:'that',explanation:'先行词是物，限制性定语从句用 that'}] },
  { title: '状语从句 (Adverbial Clauses)', level: 'B1', category: 'clause',
    explanation: '## 状语从句修饰动词、形容词或整个句子，表示时间、原因、条件、让步等。\n\n**常见类型:**\n- 时间: when, while, before, after, until, since\n- 原因: because, since, as\n- 条件: if, unless\n- 让步: although, though, even though\n- 目的: so that, in order that\n- 结果: so...that, such...that',
    examples: [{sentence:'When I got home, my mom was cooking.',translation:'当我到家时，妈妈正在做饭。',highlight:'When'},{sentence:'Because it was raining, we stayed inside.',translation:'因为下雨，我们待在室内。',highlight:'Because'},{sentence:'Although he was tired, he kept working.',translation:'虽然他很累，但他继续工作。',highlight:'Although'}],
    exercises: [{type:'multiple-choice',text:'___ it was cold, he went out without a coat.',options:['Because','Although','When','If'],answer:'Although',explanation:'让步关系用 Although'},{type:'fill-blank',text:'I will wait ___ you come back.',answer:'until',explanation:'直到...用 until'},{type:'fill-blank',text:'___ you don\'t hurry, you will be late.',answer:'If',explanation:'条件关系用 If'}] },
  { title: '名词性从句 (Noun Clauses)', level: 'B2', category: 'clause',
    explanation: '## 名词性从句在句中充当名词的角色。\n\n**类型:**\n- 主语从句: What he said is true.\n- 宾语从句: I know that he is honest.\n- 表语从句: The problem is that we have no time.\n- 同位语从句: The news that he won surprised us.\n\n**引导词:** that, whether, what, who, when, where, how, why',
    examples: [{sentence:'What you said is absolutely right.',translation:'你说的完全正确。',highlight:'What you said'},{sentence:'I don\'t know where he lives.',translation:'我不知道他住在哪里。',highlight:'where he lives'},{sentence:'The fact is that we need more time.',translation:'事实是我们需要更多时间。',highlight:'that we need more time'}],
    exercises: [{type:'fill-blank',text:'I wonder ___ he will come.',answer:'whether',explanation:'whether 引导宾语从句'},{type:'multiple-choice',text:'___ he said surprised everyone.',options:['That','What','Which','Who'],answer:'What',explanation:'What 引导主语从句'},{type:'fill-blank',text:'The problem is ___ we don\'t have enough money.',answer:'that',explanation:'that 引导表语从句'}] },

  // ===== 语态 (voice) =====
  { title: '被动语态 (Passive Voice)', level: 'B1', category: 'voice',
    explanation: '## 被动语态表示主语是动作的承受者。\n\n**构成:** be + 过去分词\n\n**各时态被动:**\n- 一般现在: am/is/are + done\n- 一般过去: was/were + done\n- 一般将来: will be + done\n- 现在进行: am/is/are being + done\n- 现在完成: have/has been + done\n\n**用法:**\n1. 不知道或不需要说明动作执行者\n2. 强调动作的承受者\n3. 正式或客观的表达',
    examples: [{sentence:'English is spoken in many countries.',translation:'英语在许多国家被使用。',highlight:'is spoken'},{sentence:'The bridge was built in 1990.',translation:'这座桥建于1990年。',highlight:'was built'},{sentence:'The work has been completed.',translation:'工作已经完成了。',highlight:'has been completed'}],
    exercises: [{type:'fill-blank',text:'The letter ___ (write) by John yesterday.',answer:'was written',explanation:'过去时被动: was + 过去分词'},{type:'fill-blank',text:'The car ___ (repair) now.',answer:'is being repaired',explanation:'现在进行时被动'},{type:'multiple-choice',text:'The cake ___ by my mother.',options:['made','was made','was making','has made'],answer:'was made',explanation:'过去时被动语态'}] },

  // ===== 语气 (mood) =====
  { title: '虚拟语气 (Subjunctive Mood)', level: 'B2', category: 'mood',
    explanation: '## 虚拟语气用于表示假设、愿望、建议等非真实的情况。\n\n**与现在事实相反:**\nIf + 主语 + 动词过去式, 主语 + would/could/might + 动词原形\n\n**与过去事实相反:**\nIf + 主语 + had + 过去分词, 主语 + would/could/might have + 过去分词\n\n**与将来事实相反:**\nIf + 主语 + should/were to + 动词原形\n\n**wish 用法:**\n- wish + 过去式: 与现在相反\n- wish + had done: 与过去相反',
    examples: [{sentence:'If I were rich, I would travel the world.',translation:'如果我有钱，我会环游世界。',highlight:'were...would travel'},{sentence:'If she had studied harder, she would have passed.',translation:'如果她更努力学习，她就通过了。',highlight:'had studied...would have passed'},{sentence:'I wish I could speak English fluently.',translation:'我希望我能流利地说英语。',highlight:'could speak'}],
    exercises: [{type:'fill-blank',text:'If I ___ (be) you, I would apologize.',answer:'were',explanation:'虚拟语气中所有称用 were'},{type:'fill-blank',text:'If he ___ (come) earlier, he wouldn\'t have missed the train.',answer:'had come',explanation:'与过去事实相反'},{type:'multiple-choice',text:'I wish I ___ more time.',options:['have','had','will have','had had'],answer:'had',explanation:'wish + 过去式表示与现在相反'}] },
  { title: '祈使句与感叹句 (Imperative & Exclamatory)', level: 'A1', category: 'mood',
    explanation: '## 祈使句表示命令、请求、建议。\n\n**构成:** 动词原形开头\n- 肯定: Open the door.\n- 否定: Don\'t open the door.\n- Let\'s: Let\'s go.\n\n## 感叹句表示强烈感情。\n\n**构成:**\n- What + (a/an) + 形容词 + 名词!\n- How + 形容词/副词!',
    examples: [{sentence:'Please sit down.',translation:'请坐下。',highlight:'sit down'},{sentence:'Don\'t be late!',translation:'别迟到！',highlight:'Don\'t be'},{sentence:'What a beautiful day!',translation:'多么美好的一天！',highlight:'What a beautiful'}],
    exercises: [{type:'fill-blank',text:'___ quiet, please!',answer:'Be',explanation:'祈使句用动词原形'},{type:'fill-blank',text:'___ interesting book this is!',answer:'What an',explanation:'What + an + 形容词 + 名词'},{type:'multiple-choice',text:'___ fast he runs!',options:['What','How','What a','How a'],answer:'How',explanation:'How + 形容词/副词'}] },

  // ===== 特殊句式 =====
  { title: '倒装句 (Inversion)', level: 'C1', category: 'other',
    explanation: '## 倒装句将谓语动词或助动词提到主语前面。\n\n**全部倒装:**\n- 地点/方位副词开头: Here comes the bus.\n- There be 句型: There is a book on the table.\n\n**部分倒装:**\n- 否定词开头: Never have I seen such a thing.\n- Only + 状语开头: Only then did I understand.\n- So/Such 开头: So beautiful was the view that...\n- 虚拟条件句省略 if: Had I known, I would have come.',
    examples: [{sentence:'Never have I been so happy.',translation:'我从未如此开心过。',highlight:'Never have I'},{sentence:'Only after the exam did I realize my mistake.',translation:'考试后我才意识到我的错误。',highlight:'Only after...did I'},{sentence:'Had I known, I would have helped.',translation:'如果我知道，我就会帮忙了。',highlight:'Had I known'}],
    exercises: [{type:'fill-blank',text:'Not only ___ (do) he speak English, but also French.',answer:'does',explanation:'Not only 开头用部分倒装'},{type:'fill-blank',text:'Seldom ___ (do) she go out at night.',answer:'does',explanation:'Seldom 否定副词开头倒装'},{type:'multiple-choice',text:'Only then ___ the truth.',options:['he realized','did he realize','he did realize','realized he'],answer:'did he realize',explanation:'Only + 状语开头用部分倒装'}] },
  { title: '强调句 (Cleft Sentences)', level: 'B2', category: 'other',
    explanation: '## 强调句用于突出句子的某个部分。\n\n**It is/was...that/who...:**\n- 强调人: It is John who/that broke the window.\n- 强调物: It was yesterday that I met her.\n- 强调地点: It was in London that they first met.\n\n**What...is/was...:**\n- What I need is a good rest.',
    examples: [{sentence:'It was Shakespeare who wrote Hamlet.',translation:'是莎士比亚写了《哈姆雷特》。',highlight:'It was...who'},{sentence:'It is in this room that the meeting will be held.',translation:'会议将在这个房间里举行。',highlight:'It is...that'},{sentence:'What I want is peace.',translation:'我想要的是和平。',highlight:'What...is'}],
    exercises: [{type:'fill-blank',text:'It ___ (be) Tom that/who called you.',answer:'was',explanation:'强调句用 It was...that/who'},{type:'fill-blank',text:'___ I love most is music.',answer:'What',explanation:'What 引导强调句'},{type:'multiple-choice',text:'It was yesterday ___ I met her.',options:['when','that','which','what'],answer:'that',explanation:'强调时间用 that'}] },

  // ===== 主谓一致 (agreement) =====
  { title: '主谓一致 (Subject-Verb Agreement)', level: 'B1', category: 'agreement',
    explanation: '## 主谓一致指主语和谓语动词在人称和数上保持一致。\n\n**基本规则:**\n- 单数主语 + 单数动词: He works hard.\n- 复数主语 + 复数动词: They work hard.\n\n**特殊情况:**\n- each, every, everyone + 单数: Everyone is here.\n- A and B + 复数: Tom and Jerry are friends.\n- A or B + 就近原则: Either you or he is wrong.\n- 不可数名词 + 单数: The news is good.\n- the number of + 单数 / a number of + 复数',
    examples: [{sentence:'The team is playing well.',translation:'球队表现很好。（team 整体用单数）',highlight:'is'},{sentence:'The police are investigating the case.',translation:'警方正在调查此案。（police 用复数）',highlight:'are'},{sentence:'Neither he nor I am wrong.',translation:'他和我都没错。（就近原则）',highlight:'am'}],
    exercises: [{type:'fill-blank',text:'Everyone ___ (be) ready.',answer:'is',explanation:'everyone 用单数'},{type:'fill-blank',text:'The number of students ___ (be) increasing.',answer:'is',explanation:'the number of + 单数'},{type:'multiple-choice',text:'Either you or he ___ wrong.',options:['are','is','am','be'],answer:'is',explanation:'either...or 就近原则'}] },

  // ===== 标点 (punctuation) =====
  { title: '英语标点符号 (Punctuation)', level: 'A2', category: 'punctuation',
    explanation: '## 常用英语标点符号\n\n**句号 .** 用于陈述句和祈使句末尾\n**逗号 ,** 用于分隔列表、从句、插入语\n**问号 ?** 用于疑问句末尾\n**感叹号 !** 用于感叹句末尾\n**引号 " "** 用于引用直接话语\n**分号 ;** 用于连接相关独立子句\n**冒号 :** 用于引出列表或解释\n**撇号 \'** 用于所有格和缩写',
    examples: [{sentence:'She said, "I love reading."',translation:'她说："我喜欢阅读。"',highlight:'said, "..."'},{sentence:'I need eggs, milk, bread, and butter.',translation:'我需要鸡蛋、牛奶、面包和黄油。',highlight:'eggs, milk, bread, and'},{sentence:'It\'s a beautiful day, isn\'t it?',translation:'今天天气真好，不是吗？',highlight:'It\'s...isn\'t'}],
    exercises: [{type:'multiple-choice',text:'Choose the correct punctuation: "Where are you going___"',options:['.','?','!','...'],answer:'?',explanation:'疑问句用问号'},{type:'fill-blank',text:'She said___ "Hello."',answer:',',explanation:'said 后用逗号引出引语'},{type:'multiple-choice',text:'___ a beautiful flower!',options:['What','How','It\'s','This is'],answer:'What',explanation:'What + a + 形容词 + 名词 感叹句'}] },
];

async function main() {
  console.log(`连接 MongoDB: ${MONGODB_URI}`);
  await mongoose.connect(MONGODB_URI);
  console.log('MongoDB 已连接\n');

  const existing = await Grammar.countDocuments();
  if (existing >= 15) {
    console.log(`已有 ${existing} 条语法，跳过`);
    await mongoose.disconnect();
    return;
  }

  let imported = 0;
  for (const data of GRAMMAR) {
    try {
      await Grammar.create(data);
      imported++;
      console.log(`✓ [${data.level}] ${data.title}`);
    } catch (err) {
      console.error(`✗ ${data.title}: ${err.message}`);
    }
  }
  console.log(`\n导入完成: ${imported} 条`);
  await mongoose.disconnect();
}

main().catch(err => { console.error(err.message); process.exit(1); });
