const { Router } = require('express');

const router = Router();

// API 文档（自动生成路由列表）
router.get('/', (req, res) => {
  res.json({
    name: '英语阅读学习 API',
    version: '1.0.0',
    baseUrl: '/api',
    endpoints: {
      auth: {
        'POST /auth/register': '注册',
        'POST /auth/login': '登录',
        'POST /auth/refresh': '刷新 token',
      },
      articles: {
        'GET /articles': '文章列表（支持 ?difficulty=&category=&tag=&page=&limit=）',
        'GET /articles/daily': '每日推荐（支持 ?limit=）',
        'GET /articles/search': '搜索（?q=关键词）',
        'GET /articles/:id': '文章详情',
        'POST /articles': '创建文章（管理员）',
        'PUT /articles/:id': '更新文章（管理员）',
        'DELETE /articles/:id': '删除文章（管理员）',
      },
      exercises: {
        'GET /articles/:articleId/exercises': '获取文章练习题',
        'POST /exercises/:id/submit': '提交练习答案',
        'POST /articles/:articleId/exercises/generate': 'AI 生成练习题',
        'GET /wrong-answers': '错题列表（?sourceType=&mastered=&page=&limit=）',
        'POST /wrong-answers/:id/review': '复习错题',
        'DELETE /wrong-answers/:id': '删除错题',
      },
      vocab: {
        'POST /vocab': '添加生词',
        'GET /vocab': '生词列表',
        'GET /vocab/review': '今日待复习单词',
        'POST /vocab/:id/review': '提交复习评分（body: {quality: 0-5}）',
        'PUT /vocab/:id': '更新生词',
        'DELETE /vocab/:id': '删除生词',
      },
      dictionary: {
        'GET /dict/:word': '查词（内置词典 + 外部 API）',
      },
      grammar: {
        'GET /grammar': '语法列表（?level=&category=）',
        'GET /grammar/:id': '语法详情 + 练习',
        'POST /grammar/:id/exercises/submit': '提交语法练习答案',
      },
      user: {
        'GET /user/profile': '个人资料',
        'PUT /user/profile': '更新资料',
        'GET /user/stats': '学习统计',
        'GET /user/history': '阅读历史',
        'POST /user/reading-log': '记录阅读行为',
      },
      ai: {
        'POST /ai/summarize': '文章摘要（body: {text, lang}）',
        'POST /ai/translate': '翻译（body: {text, targetLang}）',
        'POST /ai/generate-quiz': '智能出题（body: {content, count}）',
        'POST /ai/analyze-word': '单词解析（body: {word}）',
        'POST /ai/grammar-explain': '语法讲解（body: {topic}）',
      },
      system: {
        'GET /health': '健康检查',
        'GET /docs': 'API 文档（本页）',
      },
    },
  });
});

module.exports = router;
