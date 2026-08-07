require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Environment Variables
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
const GROUP_CHAT_ID = process.env.TELEGRAM_GROUP_ID || process.env.GROUP_CHAT_ID;

// Initialize bot with polling enabled to handle /start
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Bot /start listener
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const welcomeMessage = "ស្វាគមន៍មកកាន់ Twenty5 Realty🙏\nសូមចុចប្រអប់ Menu ដើម្បីចូលចុះឈ្មោះ";
  bot.sendMessage(chatId, welcomeMessage);
});

// Health check endpoint for UptimeRobot
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// API Registration Endpoint
app.post('/api/register', async (req, res) => {
  try {
    const {
      name,
      tel1,
      tel2,
      clientTelegram,
      target,
      propertyType,
      priceRank,
      area,
      buildingSize,
      landSize,
      bedrooms,
      bathrooms,
      direction,
      parking,
      remark,
      submittedBy
    } = req.body;

    // Format current date in Cambodia Time (Asia/Phnom_Penh)
    const now = new Date();
    const formattedDate = now.toLocaleString('en-US', {
      timeZone: 'Asia/Phnom_Penh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    // Construct Telegram message using HTML parse mode
    const message = 
`👥 <b>ព័ត៌មានភ្ញៀវថ្មី/ NEW CLIENT INQUIRY</b>
━━━━━━━━━━━━━━━━━━━━━
👤 <b>ព័ត៌មានភ្ញៀវ/ Client Profile</b>
📇 ឈ្មោះ/ Name: ${name}
📞 Tel1: ${tel1 || 'N/A'}
📞 Tel2: ${tel2 || 'N/A'}
💬 Telegram: ${clientTelegram || 'N/A'}
━━━━━━━━━━━━━━━━━━━━━
🎯 គោលបំណង/ Target: ${target}
🏗️ ប្រភេទ/ Type: ${propertyType}
💰 តម្លៃ/ Price Rank: ${priceRank}
📍 តំបន់/ Area:
${area}
🧱 ទំហំអគារ/ Building Size: ${buildingSize}
📐 ទំហំដី/ Land Size: ${landSize}
🛏 បន្ទប់គេង/ Bedrooms: ${bedrooms}
🛁 បន្ទប់ទឹក/ Bathrooms: ${bathrooms}
🧭 ទិស/ Direction: ${direction}
🅿️ ចំណត/ Parking: ${parking}
✏️ សម្គាល់/ Remark: ${remark}
━━━━━━━━━━━━━━━━━━━━━
<i>Submitted by: ${submittedBy}</i>
<i>Date: ${formattedDate}</i>`;

    // Send payload using HTML parse mode to ensure safe rendering
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: GROUP_CHAT_ID,
      text: message,
      parse_mode: 'HTML'
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending message:', error?.response?.data || error.message);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
