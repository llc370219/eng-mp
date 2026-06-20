const nodemailer = require('nodemailer');
const config = require('../config');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!config.email.host) {
    console.warn('邮件服务未配置，验证码将输出到控制台');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.port === 465,
    auth: {
      user: config.email.user,
      pass: config.email.pass,
    },
  });

  return transporter;
}

// 生成 6 位验证码
function generateCode() {
  return Math.random().toString().slice(2, 8).padStart(6, '0');
}

// 发送验证码邮件
async function sendVerificationCode(email, code, type) {
  const subject = type === 'register' ? '注册验证码' : '密码重置验证码';
  const html = `
    <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:20px">
      <h2 style="color:#4F46E5">英语阅读学习</h2>
      <p>您的${subject}为：</p>
      <div style="font-size:32px;font-weight:bold;color:#4F46E5;letter-spacing:8px;padding:16px;background:#F3F4F6;text-align:center;border-radius:8px">${code}</div>
      <p style="color:#6B7280;font-size:13px">验证码 10 分钟内有效，请勿泄露给他人。</p>
      <p style="color:#9CA3AF;font-size:11px">如果这不是您的操作，请忽略此邮件。</p>
    </div>
  `;

  const transport = getTransporter();
  if (!transport) {
    // 未配置邮件服务，输出到控制台
    console.log(`\n========================================`);
    console.log(`📧 验证码 [${type}]: ${email}`);
    console.log(`🔑 验证码: ${code}`);
    console.log(`========================================\n`);
    return true;
  }

  try {
    await transport.sendMail({
      from: config.email.from,
      to: email,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error('发送邮件失败:', err.message);
    // 降级：输出到控制台
    console.log(`\n========================================`);
    console.log(`📧 验证码 [${type}]: ${email}`);
    console.log(`🔑 验证码: ${code}`);
    console.log(`========================================\n`);
    return true;
  }
}

module.exports = { generateCode, sendVerificationCode };
