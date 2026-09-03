const express = require('express');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
const multer = require('multer');

const app = express();

// Set up Multer for handling multipart/form-data file uploads in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit per image
});

// ==========================================
// 1. MIDDLEWARE CONFIGURATION
// ==========================================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static frontend files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));


// ==========================================
// 2. ENVIRONMENT VARIABLES & BOT SETUP
// ==========================================
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const groupId = process.env.TELEGRAM_GROUP_ID;
const propertyTopicId = process.env.PROPERTY_TOPIC_ID;
const clientTopicId = process.env.CLIENT_TOPIC_ID;

let bot;

if (botToken) {
  bot = new TelegramBot(botToken, { polling: true });

  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const welcomeText = 
`ស្វាគមន៍មកកាន់ Twenty5 Realty 🙏

សូមចុចប៊ូតុង Menu (នៅជ្រុងខាងឆ្វេងផ្នែកខាងក្រោម) ដើម្បីជ្រើសរើស និងបើកទម្រង់បែបបទ៖
• 🏠 ចុះឈ្មោះភ្ញៀវ / Client Inquiry
• 🏰 ដាក់លក់/ជួល អចលនទ្រព្យ / Property Listing`;

    bot.sendMessage(chatId, welcomeText);
  });

  console.log('🤖 Telegram Bot listener initialized successfully.');
} else {
  console.warn('⚠️ TELEGRAM_BOT_TOKEN environment variable is missing!');
}


// ==========================================
// 3. HELPER FUNCTIONS
// ==========================================

// Format property message caption (Bilingual Khmer/English matching sample design)
function formatPropertyCaption(data) {
  return `
<b>🏘️ អចលនទ្រព្យថ្មី / NEW PROPERTY</b>
<b>━━━━━━━━━━━━━━━━━━━━━</b>
<b>👤 ម្ចាស់អចលនទ្រព្យ / Property Owner</b>
  <b>ឈ្មោះ / Name:</b> ${data.name || 'N/A'}
  <b>Tel1:</b> ${data.tel1 || 'N/A'}
  <b>Tel2:</b> ${data.tel2 || 'N/A'}
💬 <b>Telegram:</b> ${data.clientTelegram || 'N/A'}
<b>━━━━━━━━━━━━━━━━━━━━━</b>
🎯 <b>គោលបំណង / Target:</b> ${data.target || 'N/A'}
<b>━━━━━━━━━━━━━━━━━━━━━</b>
🏢 <b>ប្រភេទ / Type:</b> ${data.propertyType || 'N/A'}
💰 <b>តម្លៃ / Price:</b> ${data.price || 'N/A'}
📍 <b>ទីតាំង / Location:</b> ${data.location || 'N/A'}
🏢 <b>ទំហំអគារ / Building Size:</b> ${data.buildingSize || 'N/A'}
📐 <b>ទំហំដី / Land Size:</b> ${data.landSize || 'N/A'}
🛏️ <b>បន្ទប់គេង / Bedrooms:</b> ${data.bedrooms || 'N/A'}
🚿 <b>បន្ទប់ទឹក / Bathrooms:</b> ${data.bathrooms || 'N/A'}
🧭 <b>ទិស / Direction:</b> ${data.direction || 'N/A'}
🅿️ <b>ទីធ្លាចំណត / Parking Space:</b> ${data.parking || 'N/A'}
<b>━━━━━━━━━━━━━━━━━━━━━</b>
💳 <b>ការបង់ប្រាក់ / Payment Term:</b> ${data.paymentTerm || 'N/A'}
💵 <b>ប្រាក់កក់ / Deposit:</b> ${data.deposit || 'N/A'}
📜 <b>កុងត្រា / Contract:</b> ${data.contract || 'N/A'}
📝 <b>សម្គាល់ / Remark:</b> ${data.remark || 'N/A'}
<b>━━━━━━━━━━━━━━━━━━━━━</b>
👤 <b>Submitted By:</b> ${data.submittedBy || 'N/A'}
  `.trim();
}

// Helper function to send simple text messages
async function sendTelegramMessage(text, topicId) {
  if (!bot || !groupId) return;
  const options = { parse_mode: 'HTML' };
  if (topicId) options.message_thread_id = parseInt(topicId, 10);

  await bot.sendMessage(groupId, text, options);
}

// Helper function to send photos grid with formatted caption underneath
async function sendTelegramPhotosWithCaption(files, messageText, topicId) {
  if (!bot || !groupId || !files || files.length === 0) return;

  const options = {};
  if (topicId) options.message_thread_id = parseInt(topicId, 10);

  if (files.length === 1) {
    // Single Photo + Caption
    await bot.sendPhoto(groupId, files[0].buffer, {
      ...options,
      caption: messageText,
      parse_mode: 'HTML'
    });
  } else {
    // Media Album + Caption attached to the first image
    const mediaGroup = files.slice(0, 10).map((file, index) => {
      const mediaItem = {
        type: 'photo',
        media: file.buffer
      };

      if (index === 0) {
        mediaItem.caption = messageText;
        mediaItem.parse_mode = 'HTML';
      }

      return mediaItem;
    });

    await bot.sendMediaGroup(groupId, mediaGroup, options);
  }
}


// ==========================================
// 4. API ENDPOINTS
// ==========================================

// --- Property Registration Endpoint ---
app.post('/api/register-property', upload.array('photos', 10), async (req, res) => {
  try {
    const data = req.body;
    const files = req.files;

    const messageText = formatPropertyCaption(data);

    if (files && files.length > 0) {
      await sendTelegramPhotosWithCaption(files, messageText, propertyTopicId);
    } else {
      await sendTelegramMessage(messageText, propertyTopicId);
    }

    return res.status(200).json({ success: true, message: 'Property registered successfully!' });
  } catch (error) {
    console.error('Error submitting property listing:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});


// --- Client Inquiry Endpoint ---
app.post('/api/client-inquiry', async (req, res) => {
  try {
    const data = req.body;

    const message = `
<b>🔍 NEW CLIENT INQUIRY</b>
--------------------------------
<b>👤 Name:</b> ${data.name || 'N/A'}
<b>📞 Phone 1:</b> ${data.tel1 || 'N/A'}
<b>📞 Phone 2:</b> ${data.tel2 || 'N/A'}
<b>💬 Telegram:</b> ${data.clientTelegram || 'N/A'}

<b>🎯 Looking For:</b> ${data.target || 'N/A'}
<b>🏠 Property Type:</b> ${data.propertyType || 'N/A'}
<b>💰 Budget:</b> ${data.budget || 'N/A'}
<b>📍 Preferred Location:</b> ${data.preferredLocation || 'N/A'}
<b>🏢 Building Size:</b> ${data.buildingSize || 'N/A'}
<b>📐 Land Size:</b> ${data.landSize || 'N/A'}
<b>🛏 Bedrooms:</b> ${data.bedrooms || 'N/A'}
<b>🚿 Bathrooms:</b> ${data.bathrooms || 'N/A'}
<b>🧭 Direction:</b> ${data.direction || 'N/A'}
<b>⚡ Urgency Level:</b> ${data.urgentLevel || 'N/A'}
<b>📝 Remark:</b> ${data.remark || 'N/A'}

<b>👤 Submitted By:</b> ${data.submittedBy || 'N/A'}
    `.trim();

    await sendTelegramMessage(message, clientTopicId);

    return res.status(200).json({ success: true, message: 'Client inquiry submitted successfully!' });
  } catch (error) {
    console.error('Error submitting client inquiry:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});


// ==========================================
// 5. FALLBACK & ROUTING
// ==========================================
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, error: 'API route not found.' });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// ==========================================
// 6. SERVER INITIALIZATION
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
