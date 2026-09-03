const express = require('express');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

const app = express();

// ==========================================
// 1. MIDDLEWARE CONFIGURATION
// ==========================================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
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

async function sendTelegramMessage(text, topicId) {
  if (!bot || !groupId) {
    console.warn('⚠️ Cannot send message: Bot token or TELEGRAM_GROUP_ID is missing.');
    return;
  }

  const options = { parse_mode: 'HTML' };
  if (topicId) {
    options.message_thread_id = parseInt(topicId, 10);
  }

  await bot.sendMessage(groupId, text, options);
}


// ==========================================
// 3. API ENDPOINTS
// ==========================================

// --- Property Listing Endpoint (Supports multiple URL path variations) ---
const handlePropertyListing = async (req, res) => {
  try {
    const data = req.body;

    const message = `
<b>🏰 NEW PROPERTY LISTING</b>
--------------------------------
<b>🏷 Title / Type:</b> ${data.title || data.propertyType || data.type || 'N/A'}
<b>📍 Location:</b> ${data.location || data.preferredLocation || 'N/A'}
<b>💰 Price:</b> ${data.price || 'N/A'}
<b>📞 Contact:</b> ${data.contact || data.tel1 || 'N/A'}
<b>📝 Details:</b> ${data.details || data.remark || 'N/A'}
<b>👤 Submitted By:</b> ${data.submittedBy || 'N/A'}
    `.trim();

    await sendTelegramMessage(message, propertyTopicId);

    return res.status(200).json({ success: true, message: 'Property listing submitted successfully!' });
  } catch (error) {
    console.error('Error submitting property listing:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Registered routes for property listings
app.post('/api/property-listing', handlePropertyListing);
app.post('/api/property', handlePropertyListing);
app.post('/api/submit-property', handlePropertyListing);


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
// 4. FALLBACK & ROUTING
// ==========================================
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, error: 'API route not found.' });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// ==========================================
// 5. SERVER INITIALIZATION
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
