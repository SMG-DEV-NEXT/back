import 'reflect-metadata';
import axios from 'axios';
import { AuditSeverity } from './constants/audit-actions';

// Reads the same env vars the audit service uses
import * as dotenv from 'dotenv';
dotenv.config();

async function fire() {
  const token = process.env.SECURITY_TELEGRAM_GROUP_TOKEN;
  const chatId = process.env.SECURITY_TELEGRAM_GROUP_ID;

  if (!token || !chatId) {
    console.error('❌ SECURITY_TELEGRAM_GROUP_TOKEN or SECURITY_TELEGRAM_GROUP_ID not set in .env');
    process.exit(1);
  }

  const severity = AuditSeverity.CRITICAL;
  const emoji = '🚨';

  const lines = [
    `${emoji} *AUDIT ALERT — ${severity}*`,
    `Action: \`SUSPICIOUS_ACTIVITY\``,
    `Entity: \`Security\``,
    `IP: \`127.0.0.1\``,
    `Endpoint: \`POST /checkout\``,
    `Meta: \`{"event":"test_alert","note":"manual test from script"}\``,
  ].join('\n');

  console.log('Sending Telegram alert...');
  const res = await axios.post(
    `https://api.telegram.org/bot${token}/sendMessage`,
    { chat_id: chatId, text: lines, parse_mode: 'Markdown' },
  );

  console.log('✅ Sent. Telegram response:', res.data.ok);
}

fire().catch((e) => {
  console.error('❌ Failed:', e?.response?.data ?? e?.message);
  process.exit(1);
});
