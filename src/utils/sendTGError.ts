import axios from 'axios';

async function sendErrorNotification(error: any) {
  const message = `❗️ Server crashed\n\nError: ${error.message || error}`;
  const token = '8142669648:AAGZ1kRQuE14ICPPzROTiCByyaXPwMBlzQQ';
  const chatId = '1128697965';
  console.log(error);
  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text: message,
    });
  } catch (e) {
    console.error('Failed to send Telegram message:', e);
  }
  process.exit(1);
}

export default sendErrorNotification;
