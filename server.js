require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup Multer for handling up to 10 image uploads in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB per image limit
});

// Environment Variables
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
const GROUP_CHAT_ID = process.env.TELEGRAM_GROUP_ID || process.env.GROUP_CHAT_ID;
const CLIENT_TOPIC_ID = process.env.CLIENT_TOPIC_ID || process.env.TELEGRAM_TOPIC_ID;
const PROPERTY_TOPIC_ID = process.env.PROPERTY_TOPIC_ID;

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Bot /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const welcomeMessage = "ស្វាគមន៍មកកាន់ Twenty5 Realty🙏\nសូមជ្រើសរើសទម្រង់បែបបទខាងក្រោម៖";

  bot.sendMessage(chatId, welcomeMessage, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "🏠 ចុះឈ្មោះភ្ញៀវ / Client Inquiry",
            web_app: { url: `https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'your-app-url.onrender.com'}/client.html` }
          }
        ],
        [
          {
            text: "🏰 ដាក់លក់/ជួល អចលនទ្រព្យ / Property Listing",
            web_app: { url: `https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'your-app-url.onrender.com'}/property.html` }
          }
        ]
      ]
    }
  });
});

app.get('/health', (req, res) => res.status(200).send('OK'));

// Helper to format date in Cambodia Time
function getFormattedDate() {
  return new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Phnom_Penh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

// ==========================================
// 1. CLIENT INQUIRY ENDPOINT
// ==========================================
app.post('/api/register-client', async (req, res) => {
  try {
    const {
      name, tel1, tel2, clientTelegram, target, propertyType,
      priceRank, area, buildingSize, landSize, bedrooms, bathrooms,
      direction, parking, remark, submittedBy
    } = req.body;

    const message = 
`👥 <b>ព័ត៌មានភ្ញៀវថ្មី / NEW CLIENT INQUIRY</b>
━━━━━━━━━━━━━━━━━━━━━
👤 <b>ព័ត៌មានភ្ញៀវ / Client Profile</b>
📇 ឈ្មោះ / Name: ${name}
📞 Tel1: ${tel1 || 'N/A'}
📞 Tel2: ${tel2 || 'N/A'}
💬 Telegram: ${clientTelegram || 'N/A'}
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
<i>Submitted by: ${submittedBy}</i>
<i>Date: ${getFormattedDate()}</i>`;

    const telegramPayload = {
      chat_id: GROUP_CHAT_ID,
      text: message,
      parse_mode: 'HTML'
    };

    if (CLIENT_TOPIC_ID) {
      telegramPayload.message_thread_id = parseInt(CLIENT_TOPIC_ID, 10);
    }

    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(telegramPayload)
    });

    const data = await response.json();
    if (!data.ok) throw new Error(data.description);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error Client Form:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 2. PROPERTY LISTING ENDPOINT (WITH IMAGES)
// ==========================================
app.post('/api/register-property', upload.array('photos', 10), async (req, res) => {
  try {
    const {
      name, tel1, tel2, clientTelegram, target, propertyType,
      price, location, buildingSize, landSize, bedrooms, bathrooms,
      direction, parking, remark, submittedBy
    } = req.body;

    const message = 
`🏠 <b>អចលនទ្រព្យថ្មី / NEW PROPERTY</b>
━━━━━━━━━━━━━━━━━━━━━
👤 <b>ម្ចាស់អចលនទ្រព្យ / Property Owner</b>
📇 ឈ្មោះ / Name: ${name || 'N/A'}
📞 Tel1: ${tel1}
📞 Tel2: ${tel2 || 'N/A'}
💬 Telegram: ${clientTelegram || 'N/A'}
━━━━━━━━━━━━━━━━━━━━━
🎯 គោលបំណង / Target: ${target}
🏗️ ប្រភេទ / Type: ${propertyType}
💰 តម្លៃ / Price: ${price}
📍 ទីតាំង / Location: ${location}
🧱 ទំហំអគារ / Building Size: ${buildingSize || 'N/A'}
📐 ទំហំដី / Land Size: ${landSize || 'N/A'}
🛏 បន្ទប់គេង / Bedrooms: ${bedrooms || 'N/A'}
🛁 បន្ទប់ទឹក / Bathrooms: ${bathrooms || 'N/A'}
🧭 ទិស / Direction: ${direction}
🅿️ ទីធ្លាចំណត / Parking Space: ${parking}
✏️ សម្គាល់ / Remark: ${remark || 'N/A'}
🖼️ រូបភាពអចលទ្រព្យ / Pictures Attached: ${req.files ? req.files.length : 0}
━━━━━━━━━━━━━━━━━━━━━
<i>Submitted by: ${submittedBy}</i>
<i>Date: ${getFormattedDate()}</i>`;

    const topicThreadId = PROPERTY_TOPIC_ID ? parseInt(PROPERTY_TOPIC_ID, 10) : undefined;

    // Send property textual summary first
    const msgPayload = {
      chat_id: GROUP_CHAT_ID,
      text: message,
      parse_mode: 'HTML'
    };
    if (topicThreadId) msgPayload.message_thread_id = topicThreadId;

    const summaryRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msgPayload)
    });
    const summaryData = await summaryRes.json();
    if (!summaryData.ok) throw new Error(summaryData.description);

    // Send attached pictures into the same topic thread using sendMediaGroup
    if (req.files && req.files.length > 0) {
      const formData = new FormData();
      formData.append('chat_id', GROUP_CHAT_ID);
      if (topicThreadId) formData.append('message_thread_id', topicThreadId);

      const mediaGroup = req.files.map((file, idx) => {
        const attachName = `photo_${idx}`;
        const blob = new Blob([file.buffer], { type: file.mimetype });
        formData.append(attachName, blob, file.originalname);
        return { type: 'photo', media: `attach://${attachName}` };
      });

      formData.append('media', JSON.stringify(mediaGroup));

      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMediaGroup`, {
        method: 'POST',
        body: formData
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error Property Form:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
