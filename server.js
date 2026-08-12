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

// Initialize bot with polling enabled
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// UPDATED /start HANDLER (WORKS IN GROUPS & PRIVATE CHATS)
// ==========================================
bot.onText(/\/start(@\w+)?/, async (msg) => {
  const chatId = msg.chat.id;
  const isGroup = msg.chat.type === 'group' || msg.chat.type === 'supergroup';
  const baseUrl = `https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'your-app-name.onrender.com'}`;
  
  let botUsername = '';
  try {
    const botInfo = await bot.getMe();
    botUsername = botInfo.username;
  } catch (err) {
    console.error('Error fetching bot info:', err.message);
  }

  let inlineKeyboard = [];

  if (isGroup) {
    // In Groups: Send direct links to private chat because Telegram blocks WebApps directly in groups
    inlineKeyboard = [
      [
        {
          text: "🏠 ចុះឈ្មោះភ្ញៀវ / Client Inquiry",
          url: `https://t.me/${botUsername}?start=client`
        }
      ],
      [
        {
          text: "🏠 ដាក់លក់/ជួល អចលនទ្រព្យ / Property Listing",
          url: `https://t.me/${botUsername}?start=property`
        }
      ]
    ];
  } else {
    // In Private Chat: Send direct Web App mini-app buttons
    inlineKeyboard = [
      [
        {
          text: "🏠 ចុះឈ្មោះភ្ញៀវ / Client Inquiry",
          web_app: { url: `${baseUrl}/client.html` }
        }
      ],
      [
        {
          text: "🏠 ដាក់លក់/ជួល អចលនទ្រព្យ / Property Listing",
          web_app: { url: `${baseUrl}/property.html` }
        }
      ]
    ];
  }

  const welcomeMessage = "ស្វាគមន៍មកកាន់ Twenty5 Realty🙏\nសូមជ្រើសរើសទម្រង់បែបបទខាងក្រោម៖";

  const options = {
    reply_markup: {
      inline_keyboard: inlineKeyboard
    }
  };

  // Reply inside the specific topic thread if sent in a forum topic
  if (msg.message_thread_id) {
    options.message_thread_id = msg.message_thread_id;
  }

  bot.sendMessage(chatId, welcomeMessage, options);
});

// Health check endpoint for UptimeRobot / Render
app.get('/health', (req, res) => res.status(200).send('OK'));

// Helper function to format Cambodia local time
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
👤 <b>ព័ត៌មានភ្ញៀវ/ Client Profile</b>
📇 ឈ្មោះ/ Name: ${name}
📞 Tel1: ${tel1 || 'N/A'}
📞 Tel2: ${tel2 || 'N/A'}
💬 Telegram: ${clientTelegram || 'N/A'}
━━━━━━━━━━━━━━━━━━━━━
🎯 គោលបំណង/ Target: ${target}
━━━━━━━━━━━━━━━━━━━━━
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
// 2. PROPERTY LISTING ENDPOINT (WITH MEDIA CAPTION)
// ==========================================
app.post('/api/register-property', upload.array('photos', 10), async (req, res) => {
  try {
    const {
      name, tel1, tel2, clientTelegram, target, propertyType,
      price, location, buildingSize, landSize, bedrooms, bathrooms,
      direction, parking, paymentTerm, deposit, contract, remark, submittedBy
    } = req.body;

    const message = 
`🏠 <b>អចលនទ្រព្យថ្មី / NEW PROPERTY</b>
━━━━━━━━━━━━━━━━━━━━━
👤 <b>ម្ចាស់អចលនទ្រព្យ / Property Owner</b>
📇 ឈ្មោះ/ Name: ${name || 'N/A'}
📞 Tel1: ${tel1}
📞 Tel2: ${tel2 || 'N/A'}
💬 Telegram: ${clientTelegram || 'N/A'}
━━━━━━━━━━━━━━━━━━━━━
🎯 គោលបំណង/ Target: ${target}
━━━━━━━━━━━━━━━━━━━━━
🏗️ ប្រភេទ/ Type: ${propertyType}
💰 តម្លៃ/ Price: ${price}
📍 ទីតាំង/ Location: ${location}
🧱 ទំហំអគារ/ Building Size: ${buildingSize || 'N/A'}
📐 ទំហំដី/ Land Size: ${landSize || 'N/A'}
🛏 បន្ទប់គេង/ Bedrooms: ${bedrooms || 'N/A'}
🛁 បន្ទប់ទឹក/ Bathrooms: ${bathrooms || 'N/A'}
🧭 ទិស/ Direction: ${direction || 'N/A'}
🅿️ ទីធ្លាចំណត/ Parking Space: ${parking || 'N/A'}
━━━━━━━━━━━━━━━━━━━━━
💳 ការបង់ប្រាក់/ Payment Term: ${paymentTerm || 'N/A'}
💵 ប្រាក់កក់/ Deposit: ${deposit || 'N/A'}
📝 កុងត្រា/ Contract: ${contract || 'N/A'}
✏️ សម្គាល់/ Remark: ${remark || 'N/A'}
🖼️ រូបភាពអចលនទ្រព្យ/ Pictures Attached: ${req.files ? req.files.length : 0}
━━━━━━━━━━━━━━━━━━━━━
<i>Submitted by: ${submittedBy || 'N/A'}</i>
<i>Date: ${getFormattedDate()}</i>`;

    const topicThreadId = PROPERTY_TOPIC_ID ? parseInt(PROPERTY_TOPIC_ID, 10) : undefined;

    if (req.files && req.files.length > 0) {
      const formData = new FormData();
      formData.append('chat_id', GROUP_CHAT_ID);
      if (topicThreadId) formData.append('message_thread_id', topicThreadId);

      const mediaGroup = req.files.map((file, idx) => {
        const attachName = `photo_${idx}`;
        const blob = new Blob([file.buffer], { type: file.mimetype });
        formData.append(attachName, blob, file.originalname);

        const item = { type: 'photo', media: `attach://${attachName}` };
        if (idx === 0) {
          item.caption = message;
          item.parse_mode = 'HTML';
        }
        return item;
      });

      formData.append('media', JSON.stringify(mediaGroup));

      const mediaRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMediaGroup`, {
        method: 'POST',
        body: formData
      });
      const mediaData = await mediaRes.json();
      if (!mediaData.ok) throw new Error(mediaData.description);

    } else {
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