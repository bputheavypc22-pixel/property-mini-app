require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// UptimeRobot Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// API Registration Endpoint
app.post('/api/register', async (req, res) => {
  const {
    name,
    phone,
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

  // Format local Cambodian time
  const now = new Date();
  const dateOptions = {
    timeZone: 'Asia/Phnom_Penh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  };
  const formattedDate = now.toLocaleString('en-US', dateOptions);

  // Exact requested card layout
  const message = 
`*🏠 ព័ត៌មានភ្ញៀវថ្មី / NEW CLIENT INQUIRY*
━━━━━━━━━━━━━━━━━━━━━
*👤 ព័ត៌មានភ្ញៀវ / Client Profile*
🧑‍🦱 ឈ្មោះ / Name: ${name}
📞 Tel: ${phone}
💬 Telegram: ${clientTelegram}
━━━━━━━━━━━━━━━━━━━━━
🎯 គោលបំណង / Target: ${target}
🏗️ ប្រភេទ / Type: ${propertyType}
💰 តម្លៃ / Price Rank: ${priceRank}
📍 តំបន់ / Area:
${area}
🧱 ទំហំអគារ / Building Size: ${buildingSize}
📐 ទំហំដី / Land Size: ${landSize}
🛏 បន្ទប់គេង / Bedrooms: ${bedrooms}
🛁 បន្ទប់ទឹក / Bathrooms: ${bathrooms}
🧭 ទិស / Direction: ${direction}
🅿️ ចំណត / Parking: ${parking}
✏️ សម្គាល់ / Remark: ${remark}
━━━━━━━━━━━━━━━━━━━━━
_Submitted by: ${submittedBy}_
_Date: ${formattedDate}_`;

  try {
    await bot.sendMessage(process.env.TELEGRAM_GROUP_ID, message, { parse_mode: 'Markdown' });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending message to Telegram:', error);
    res.status(500).json({ success: false });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
