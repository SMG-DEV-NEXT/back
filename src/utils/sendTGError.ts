import axios from 'axios';

async function sendErrorNotification(error: any) {
  const message = `❗️ Server crashed\n\nError: ${error.message || error}`;
  const token = '8142669648:AAGZ1kRQuE14ICPPzROTiCByyaXPwMBlzQQ';
  const chatId = '1128697965';
  const allowedChatIds = ['1128697965', '1083448745', '1482996433'];
  try {
    for (const chatId of allowedChatIds) {
      try {
        await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
          chat_id: chatId.trim(),
          text: message,
        });
      } catch (e) {
        console.error(`❌ Failed to send Telegram message to ${chatId}:`, e);
      }
    }
  } catch (e) {
    console.error('Failed to send Telegram message:', e);
  }
  process.exit(1);
}

export default sendErrorNotification;
