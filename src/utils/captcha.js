// 简易数学验证码（SVG 生成，无需外部依赖）
// 存储在内存中，生产环境建议替换为 Redis

const captchas = new Map(); // token -> { answer, expiresAt }

// 定期清理过期验证码
setInterval(() => {
  const now = Date.now();
  for (const [token, record] of captchas) {
    if (now > record.expiresAt) captchas.delete(token);
  }
}, 60 * 1000);

// 生成随机整数
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 生成随机颜色
function randColor(min = 0, max = 200) {
  const r = randInt(min, max);
  const g = randInt(min, max);
  const b = randInt(min, max);
  return `rgb(${r},${g},${b})`;
}

// 生成随机 token
function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) token += chars[randInt(0, chars.length - 1)];
  return token;
}

/**
 * 生成数学验证码 SVG
 * @returns {{ token: string, svg: string }}
 */
function generateCaptcha() {
  // 生成数学题：a + b = ? 或 a - b = ? 或 a × b = ?
  const ops = [
    { symbol: '+', fn: (a, b) => a + b },
    { symbol: '-', fn: (a, b) => a - b },
    { symbol: '×', fn: (a, b) => a * b },
  ];
  const op = ops[randInt(0, ops.length - 1)];

  let a, b;
  if (op.symbol === '×') {
    a = randInt(2, 12);
    b = randInt(2, 9);
  } else if (op.symbol === '-') {
    a = randInt(5, 30);
    b = randInt(1, a - 1);
  } else {
    a = randInt(1, 30);
    b = randInt(1, 30);
  }

  const answer = String(op.fn(a, b));
  const question = `${a} ${op.symbol} ${b} = ?`;

  // 生成 SVG
  const width = 160;
  const height = 50;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;

  // 背景
  svg += `<rect width="${width}" height="${height}" fill="${randColor(220, 255)}"/>`;

  // 干扰线
  for (let i = 0; i < 4; i++) {
    svg += `<line x1="${randInt(0, width)}" y1="${randInt(0, height)}" x2="${randInt(0, width)}" y2="${randInt(0, height)}" stroke="${randColor(100, 200)}" stroke-width="1"/>`;
  }

  // 干扰点
  for (let i = 0; i < 20; i++) {
    svg += `<circle cx="${randInt(5, width - 5)}" cy="${randInt(5, height - 5)}" r="1.5" fill="${randColor(0, 180)}"/>`;
  }

  // 文字
  const chars = question.split('');
  const charWidth = width / (chars.length + 1);
  chars.forEach((char, i) => {
    const x = charWidth * (i + 0.8);
    const y = randInt(28, 40);
    const rotate = randInt(-20, 20);
    const color = randColor(0, 120);
    const fontSize = randInt(18, 24);
    svg += `<text x="${x}" y="${y}" font-size="${fontSize}" font-family="Arial,sans-serif" font-weight="bold" fill="${color}" transform="rotate(${rotate},${x},${y})">${char}</text>`;
  });

  svg += `</svg>`;

  // 存储答案（5分钟过期）
  const token = generateToken();
  captchas.set(token, { answer, expiresAt: Date.now() + 5 * 60 * 1000 });

  return { token, svg };
}

/**
 * 验证用户输入
 * @param {string} token - 验证码 token
 * @param {string} answer - 用户输入的答案
 * @returns {boolean}
 */
function verifyCaptcha(token, answer) {
  if (!token || !answer) return false;
  const record = captchas.get(token);
  if (!record) return false;

  // 验证后立即删除（一次性）
  captchas.delete(token);

  if (Date.now() > record.expiresAt) return false;
  return String(answer).trim() === record.answer;
}

module.exports = { generateCaptcha, verifyCaptcha };
