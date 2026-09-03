const express = require('express');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

const app = express();

// ==========================================
// 1. MIDDLEWARE CONFIGURATION
// ==========================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));


// ==========================================
// 2. TELEGRAM BOT INITIALIZATION
// ==========================================
const botToken = process.env.BOT_TOKEN;
const defaultChatId = process.env.CHAT_ID;

let bot;

if (botToken) {
  // Initialize bot with polling to listen for incoming Telegram messages (/start)
  bot = new TelegramBot(botToken, { polling: true });

  // Handle /start command
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
  console.warn('⚠️ BOT_TOKEN environment variable is missing!');
}


// Helper function for sending notifications from web forms
async function sendTelegramNotification(text) {
  if (!bot || !defaultChatId) {
    console.warn('⚠️ Cannot send Telegram notification: Bot or CHAT_ID not configured.');
    return;
  }
  await bot.sendMessage(defaultChatId, text, { parse_mode: 'HTML' });
}


// ==========================================
// 3. API ENDPOINTS (Web App Forms)
// ==========================================

// --- Property Listing Endpoint ---
app.post('/api/property-listing', async (req, res) => {
  try {
    const data = req.body;

    const message = `
<b>🏠 NEW PROPERTY LISTING</b>
--------------------------------
<b>🏷 Title / Type:</b> ${data.title || data.propertyType || 'N/A'}
<b>📍 Location:</b> ${data.location || 'N/A'}
<b>💰 Price:</b> ${data.price || 'N/A'}
<b>📞 Contact:</b> ${data.contact || 'N/A'}
<b>📝 Details:</b> ${data.details || 'N/A'}
<b>👤 Submitted By:</b> ${data.submittedBy || 'N/A'}
    `.trim();

    await sendTelegramNotification(message);

    return res.status(200).json({ success: true, message: 'Property listing submitted successfully!' });
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

    await sendTelegramNotification(message);

    return res.status(200).json({ success: true, message: 'Client inquiry submitted successfully!' });
  } catch (error) {
    console.error('Error submitting client inquiry:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});


// ==========================================
// 4. FALLBACK & ERROR HANDLING
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
