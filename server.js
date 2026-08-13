require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const multer = require('multer');
const path = require('path');
const { JWT } = require('google-auth-library');
const { GoogleSpreadsheet } = require('google-spreadsheet');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup Multer for handling up to 10 image uploads in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit per image
});

// Environment Variables
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
const GROUP_CHAT_ID = process.env.TELEGRAM_GROUP_ID || process.env.GROUP_CHAT_ID;
const CLIENT_TOPIC_ID = process.env.CLIENT_TOPIC_ID || process.env.TELEGRAM_TOPIC_ID;
const PROPERTY_TOPIC_ID = process.env.PROPERTY_TOPIC_ID;

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
// Handle escaped newlines in private key
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : null;

// Initialize Google Sheets Doc
let doc = null;

async function initGoogleSheets() {
  if (!GOOGLE_SHEET_ID || !GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    console.warn('⚠️ Google Sheets credentials missing. Skipping Sheets integration.');
    return;
  }

  try {
    const serviceAccountAuth = new JWT({
      email: GOOGLE_CLIENT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    doc = new GoogleSpreadsheet(GOOGLE_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    console.log(`✅ Google Sheets connected: "${doc.title}"`);
  } catch (error) {
    console.error('❌ Failed to connect to Google Sheets:', error.message);
  }
}

// Initialize Sheets Connection
initGoogleSheets();

// Initialize Telegram Bot
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

// Helper function to safely append row to a specific worksheet
async function appendToSheet(sheetTitle, rowData) {
  if (!doc) return;
  try {
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle[sheetTitle];
    if (sheet) {
      await sheet.addRow(rowData);
      console.log(`📊 Successfully logged entry to sheet: "${sheetTitle}"`);
    } else {
      console.error(`❌ Sheet tab titled "${sheetTitle}" not found in Google Sheet.`);
    }
  } catch (err) {
    console.error(`❌ Error appending to Google Sheet ("${sheetTitle}"):`, err.message);
  }
}

// ==========================================
// /start COMMAND HANDLER
// ==========================================
bot.onText(/\/start(@\w+)?/, async (msg) => {
  const chatId = msg.chat.id;
  const isGroup = msg.chat.type === 'group' || msg.chat.type === 'supergroup';

  let botUsername = 'Twenty5RealtyBot';
  try {
    const botInfo = await bot.getMe();
    botUsername = botInfo.username;
  } catch (err) {
    console.error('Error fetching bot username:', err.message);
  }

  // 1. IF IN GROUP: Reply with 1 inline redirect button
  if (isGroup) {
    const groupMessage = "ស្វាគមន៍មកកាន់ Twenty5 Realty 🙏\nសូមចុចប៊ូតុងខាងក្រោមដើម្បីចូលទៅបំពេញទម្រង់បែបបទ៖";
    
    const groupOptions = {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "👉 ចុចដើម្បីចូលទៅបំពេញពាក្យ / Click to direct to the form",
              url: `https://t.me/${botUsername}?start=welcome`
            }
          ]
        ]
      }
    };

    if (msg.message_thread_id) {
      groupOptions.message_thread_id = msg.message_thread_id;
    }

    return bot.sendMessage(chatId, groupMessage, groupOptions);
  }

  // 2. IF IN PRIVATE CHAT: Send ONLY welcome message + instructions
  const welcomePrivateMessage = 
`ស្វាគមន៍មកកាន់ Twenty5 Realty 🙏

សូមចុចប៊ូតុង **Menu** (នៅជ្រុងខាងឆ្វេងផ្នែកខាងក្រោម) ដើម្បីជ្រើសរើស និងបើកទម្រង់បែបបទ៖
• 🏠 ចុះឈ្មោះភ្ញៀវ / Client Inquiry
• 🏰 ដាក់លក់/ជួល អចលនទ្រព្យ / Property Listing`;

  bot.sendMessage(chatId, welcomePrivateMessage, { parse_mode: 'Markdown' });
});

// Health check endpoint
app.get('/health', (req, res) => res.status(200).send('OK'));

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

    const formattedDate = getFormattedDate();

    // 1. Format Telegram Message
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
<i>Date: ${formattedDate}</i>`;

    const telegramPayload = {
      chat_id: GROUP_CHAT_ID,
      text: message,
      parse_mode: 'HTML'
    };

    if (CLIENT_TOPIC_ID) {
      telegramPayload.message_thread_id = parseInt(CLIENT_TOPIC_ID, 10);
    }

    // Send to Telegram
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(telegramPayload)
    });

    const data = await response.json();
    if (!data.ok) throw new Error(data.description);

    const telegramMsgId = data.result ? data.result.message_id : '';

    // 2. Save to Google Sheets
    await appendToSheet('Client Inquiries', {
      'Register Date': formattedDate,
      'Name': name || '',
      'Tel 1': tel1 || '',
      'Tel 2': tel2 || '',
      'Telegram': clientTelegram || '',
      'Target': target || '',
      'Property Type': propertyType || '',
      'Price Rank': priceRank || '',
      'Area': area || '',
      'Building Size': buildingSize || '',
      'Land Size': landSize || '',
      'Bedrooms': bedrooms || '',
      'Bathrooms': bathrooms || '',
      'Direction': direction || '',
      'Parking': parking || '',
      'Remark': remark || '',
      'Submitted By': submittedBy || ''
    });

    res.status(200).json({ success: true, messageId: telegramMsgId });
  } catch (error) {
    console.error('Error Client Form:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 2. PROPERTY LISTING ENDPOINT
// ==========================================
app.post('/api/register-property', upload.array('photos', 10), async (req, res) => {
  try {
    const {
      name, tel1, tel2, clientTelegram, target, propertyType,
      price, location, buildingSize, landSize, bedrooms, bathrooms,
      direction, parking, paymentTerm, deposit, contract, remark, submittedBy
    } = req.body;

    const formattedDate = getFormattedDate();
    const photoCount = req.files ? req.files.length : 0;

    // 1. Format Telegram Message
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
🖼️ រូបភាពអចលនទ្រព្យ/ Pictures Attached: ${photoCount}
━━━━━━━━━━━━━━━━━━━━━
<i>Submitted by: ${submittedBy || 'N/A'}</i>
<i>Date: ${formattedDate}</i>`;

    const topicThreadId = PROPERTY_TOPIC_ID ? parseInt(PROPERTY_TOPIC_ID, 10) : undefined;
    let telegramMsgId = '';

    // Send Media / Message to Telegram Group
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
      
      if (mediaData.result && mediaData.result.length > 0) {
        telegramMsgId = mediaData.result[0].message_id;
      }

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

      if (summaryData.result) {
        telegramMsgId = summaryData.result.message_id;
      }
    }

    // 2. Save to Google Sheets
    await appendToSheet('Property Listings', {
      'Register Date': formattedDate,
      'Owner Name': name || '',
      'Tel 1': tel1 || '',
      'Tel 2': tel2 || '',
      'Telegram': clientTelegram || '',
      'Target': target || '',
      'Property Type': propertyType || '',
      'Price': price || '',
      'Location': location || '',
      'Building Size': buildingSize || '',
      'Land Size': landSize || '',
      'Bedrooms': bedrooms || '',
      'Bathrooms': bathrooms || '',
      'Direction': direction || '',
      'Parking': parking || '',
      'Payment Term': paymentTerm || '',
      'Deposit': deposit || '',
      'Contract': contract || '',
      'Remark': remark || '',
      'Photos Count': photoCount,
      'Submitted By': submittedBy || ''
    });

    res.status(200).json({ success: true, messageId: telegramMsgId });
  } catch (error) {
    console.error('Error Property Form:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});