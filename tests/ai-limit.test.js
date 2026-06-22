const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const config = require('../src/config');
const User = require('../src/models/User');
const articleGenerator = require('../src/services/articleGenerator');

// Mock articleGenerator.generate to avoid hitting real external APIs
jest.mock('../src/services/articleGenerator', () => ({
  generate: jest.fn()
}));

describe('AI Article Generation Rate Limiting', () => {
  let testUser;
  let authToken;

  beforeAll(async () => {
    // Connect to test database if not connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongodb.uri);
    }
  });

  afterAll(async () => {
    // Clean up connections
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up or seed test data
    await User.deleteMany({ email: 'aitest@example.com' });
    
    const passwordHash = await User.hashPassword('password123');
    testUser = await User.create({
      email: 'aitest@example.com',
      passwordHash,
      nickname: 'AITestUser',
      aiLimit: 1,
      aiGeneratedCountToday: 0,
      lastAiGeneratedAt: null
    });

    authToken = jwt.sign({ userId: testUser._id }, config.jwt.secret);
  });

  afterEach(async () => {
    await User.deleteMany({ email: 'aitest@example.com' });
    jest.clearAllMocks();
  });

  test('默认每日限额为1次，第一次生成成功，第二次触发429限额', async () => {
    articleGenerator.generate.mockResolvedValue({
      title: 'Test Article',
      content: 'This is a test article.',
      summaryZh: '这是一篇测试文章。',
      difficulty: '高中',
      category: 'life',
      wordCount: 100
    });

    // 第一次调用：应该成功
    const res1 = await request(app)
      .post('/api/frontend/generate-article')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ prompt: 'test theme', level: '高中' });

    expect(res1.status).toBe(200);
    expect(res1.body.title).toBe('Test Article');

    // 检查数据库记录
    const updatedUser = await User.findById(testUser._id);
    expect(updatedUser.aiGeneratedCountToday).toBe(1);
    expect(updatedUser.lastAiGeneratedAt).toBeInstanceOf(Date);

    // 第二次调用：应该返回429
    const res2 = await request(app)
      .post('/api/frontend/generate-article')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ prompt: 'another theme', level: '高中' });

    expect(res2.status).toBe(429);
    expect(res2.body.error).toContain('AI 生成额度已用完');
  });

  test('如果生成出错，调用次数应该回滚', async () => {
    // 模拟生成出错
    articleGenerator.generate.mockResolvedValue({
      error: 'AI Generation Failed'
    });

    const res = await request(app)
      .post('/api/frontend/generate-article')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ prompt: 'error theme', level: '高中' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('AI Generation Failed');

    // 检查数据库记录，已生成次数仍为0
    const updatedUser = await User.findById(testUser._id);
    expect(updatedUser.aiGeneratedCountToday).toBe(0);
  });

  test('管理员调大限额后，用户可以继续生成', async () => {
    articleGenerator.generate.mockResolvedValue({
      title: 'Test Article 2',
      content: 'This is another test article.',
      summaryZh: '这是另一篇测试文章。',
      difficulty: '高中',
      category: 'life',
      wordCount: 100
    });

    // 将限额改大为 2
    testUser.aiLimit = 2;
    await testUser.save();

    // 第一次调用
    const res1 = await request(app)
      .post('/api/frontend/generate-article')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ prompt: 'theme 1', level: '高中' });
    expect(res1.status).toBe(200);

    // 第二次调用
    const res2 = await request(app)
      .post('/api/frontend/generate-article')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ prompt: 'theme 2', level: '高中' });
    expect(res2.status).toBe(200);

    // 第三次调用：触发429
    const res3 = await request(app)
      .post('/api/frontend/generate-article')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ prompt: 'theme 3', level: '高中' });
    expect(res3.status).toBe(429);
  });
});
