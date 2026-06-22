const nodemailer = require('nodemailer');
const config = require('../config');

let transporter = null;
let resendClient = null;

// ===== Resend 客户端（首选，HTTP API 不受端口封锁） =====
function getResendClient() {
  if (resendClient) return resendClient;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  const { Resend } = require('resend');
  resendClient = new Resend(key);
  return resendClient;
}

// ===== SMTP 客户端（备用） =====
function getTransporter() {
  if (transporter) return transporter;
  if (!config.email.host) return null;
  transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.port === 465,
    auth: { user: config.email.user, pass: config.email.pass },
  });
  return transporter;
}

// 生成 6 位验证码
function generateCode() {
  return Math.random().toString().slice(2, 8).padStart(6, '0');
}

// 发送验证码邮件（调试模式：直接输出到控制台，不产生任何 API 调用）
async function sendVerificationCode(email, code, type) {
  const subject = type === 'register' ? '注册验证码' : '密码重置验证码';
  
  console.log('\n====================================');
  console.log(`🔑 验证码 [${subject}]: ${email} -> [${code}]`);
  console.log('====================================\n');

  return { sent: true, via: 'console' };
}

module.exports = { generateCode, sendVerificationCode };
