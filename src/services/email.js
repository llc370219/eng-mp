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

// 发送验证码邮件，返回 { sent: boolean, code: string }
async function sendVerificationCode(email, code, type) {
  const subject = type === 'register' ? '注册验证码' : '密码重置验证码';
  const html = `
    <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:20px">
      <h2 style="color:#ec6a2b">🍊 Lull · 听简</h2>
      <p>您的${subject}为：</p>
      <div style="font-size:32px;font-weight:bold;color:#ec6a2b;letter-spacing:8px;padding:16px;background:#f2ecda;text-align:center;border-radius:8px">${code}</div>
      <p style="color:#6B7280;font-size:13px">验证码 10 分钟内有效，请勿泄露给他人。</p>
      <p style="color:#9CA3AF;font-size:11px">如果这不是您的操作，请忽略此邮件。</p>
    </div>
  `;

  // 方式 1：Resend（HTTP API，不受云平台端口封锁）
  const resend = getResendClient();
  if (resend) {
    try {
      await resend.emails.send({
        from: 'Lull 听简 <onboarding@resend.dev>',
        to: email,
        subject,
        html,
      });
      console.log(`📧 Resend 验证码已发送: ${email}`);
      return { sent: true, via: 'resend' };
    } catch (err) {
      console.error('Resend 发送失败:', err.message);
    }
  }

  // 方式 2：SMTP（备用）
  const transport = getTransporter();
  if (transport) {
    try {
      await transport.sendMail({
        from: config.email.from,
        to: email,
        subject,
        html,
      });
      console.log(`📧 SMTP 验证码已发送: ${email}`);
      return { sent: true, via: 'smtp' };
    } catch (err) {
      console.error('SMTP 发送失败:', err.message);
    }
  }

  // 方式 3：全部失败
  console.log(`⚠️ 邮件发送失败，验证码: ${code} → ${email}`);
  return { sent: false, via: 'none' };
}

module.exports = { generateCode, sendVerificationCode };
