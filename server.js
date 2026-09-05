const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const port = process.env.PORT || 10000;

// Environment variables mapped directly to your Render settings
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_GROUP_ID || process.env.CHAT_ID;
const PROPERTY_TOPIC_ID = process.env.PROPERTY_TOPIC_ID;
const CLIENT_TOPIC_ID = process.env.CLIENT_TOPIC_ID;

// Enable Telegram Bot Polling so /start command works directly in chat
let bot = null;
if (BOT_TOKEN) {
  bot = new TelegramBot(BOT_TOKEN, { polling: true });

  // Respond to /start command
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const welcomeText = `សូមស្វាគមន៍មកកាន់ Twenty5Realty! សូមចុច Open Form ដើម្បីបំពេញបែបបទ។\n\nWelcome to Twenty5Realty! Please Click Open Form to get the Form.`;
    bot.sendMessage(chatId, welcomeText);
  });
} else {
  console.error("CRITICAL ERROR: TELEGRAM_BOT_TOKEN is missing on Render settings!");
}

// Memory storage for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit per image
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTML Page Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'property.html'));
});

app.get('/client-inquiry', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'client-inquiry.html'));
});

// ==========================================
// 1. CLIENT INQUIRY ENDPOINT (Target Topic: CLIENT_TOPIC_ID)
// ==========================================
app.post('/api/client-inquiry', async (req, res) => {
  try {
    if (!BOT_TOKEN || !CHAT_ID) {
      return res.status(500).json({ 
        success: false, 
        error: 'TELEGRAM_BOT_TOKEN or TELEGRAM_GROUP_ID variables are missing on Render.' 
      });
    }

    const data = req.body;

    let inquiryMessage = `<b>📩 ព័ត៌មានស្វែងរកអចលនទ្រព្យ / Client Inquiry</b>\n\n`;
    inquiryMessage += `<b>👤 ព័ត៌មានអតិថិជន / Client Details:</b>\n`;
    inquiryMessage += `• ឈ្មោះ / Name: <b>${data.name || 'N/A'}</b>\n`;
    inquiryMessage += `• លេខទូរស័ព្ទ / Phone: <b>${data.phone || 'N/A'}</b>\n`;
    if (data.telegram) inquiryMessage += `• Telegram: ${data.telegram}\n`;

    inquiryMessage += `\n<b>🎯 តម្រូវការ / Requirements:</b>\n`;
    inquiryMessage += `• គោលបំណង / Purpose: <b>${data.purpose || 'N/A'}</b>\n`;
    inquiryMessage += `• ប្រភេទ / Property Type: <b>${data.propertyType || 'N/A'}</b>\n`;
    if (data.budget) inquiryMessage += `• ថវិកា / Budget: <b>$${data.budget}</b>\n`;
    if (data.preferredLocation) inquiryMessage += `• ទីតាំងចង់បាន / Preferred Location: ${data.preferredLocation}\n`;
    if (data.notes) inquiryMessage += `\n<b>📝 កំណត់សម្គាល់បន្ថែម / Additional Notes:</b>\n${data.notes}\n`;

    const payload = {
      chat_id: CHAT_ID,
      text: inquiryMessage,
      parse_mode: 'HTML'
    };

    // Forward to Client Inquiry topic thread if configured
    if (CLIENT_TOPIC_ID) {
      payload.message_thread_id = Number(CLIENT_TOPIC_ID);
    }

    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, payload);

    return res.status(200).json({ success: true, message: 'Inquiry submitted successfully!' });

  } catch (error) {
    console.error('Client Inquiry Error:', error.response?.data || error.message);
    return res.status(500).json({ 
      success: false, 
      error: error.response?.data?.description || 'Failed to submit client inquiry.' 
    });
  }
});

// ==========================================
// 2. PROPERTY LISTING ENDPOINT (Target Topic: PROPERTY_TOPIC_ID)
// ==========================================
app.post('/api/submit', upload.array('photos', 10), async (req, res) => {
  try {
    if (!BOT_TOKEN || !CHAT_ID) {
      return res.status(500).json({ 
        success: false, 
        error: 'TELEGRAM_BOT_TOKEN or TELEGRAM_GROUP_ID variables are missing on Render.' 
      });
    }

    const data = req.body;
    const files = req.files || [];

    // Format display choices
    let depositDisplay = data.deposit || 'N/A';
    if ((data.deposit === 'ផ្សេងៗ' || data.deposit === 'Other') && data.depositOther) {
      depositDisplay = `${data.deposit} (${data.depositOther})`;
    }

    let certDisplay = data.certificate || 'N/A';
    if ((data.certificate === 'ប្រភេទផ្សេង' || data.certificate === 'Other type') && data.certOther) {
      certDisplay = `${data.certificate} (${data.certOther})`;
    }

    // Build Telegram property message
    let messageText = `<b>🏠 ព័ត៌មានអចលនទ្រព្យ / Property Listing</b>\n\n`;
    messageText += `<b>👤 ព័ត៌មានម្ចាស់ / Owner Details:</b>\n`;
    messageText += `• ឈ្មោះ / Name: <b>${data.ownerName || 'N/A'}</b>\n`;
    messageText += `• លេខទូរស័ព្ទ ១ / Tel 1: <b>${data.tel1 || 'N/A'}</b>\n`;
    if (data.tel2) messageText += `• លេខទូរស័ព្ទ ២ / Tel 2: ${data.tel2}\n`;
    if (data.telegram) messageText += `• Telegram: ${data.telegram}\n`;

    messageText += `\n<b>📌 ព័ត៌មានអចលនទ្រព្យ / Property Info:</b>\n`;
    messageText += `• គោលបំណង / Purpose: <b>${data.listingType || 'N/A'}</b>\n`;
    messageText += `• ប្រភេទ / Type: <b>${data.propertyType || 'N/A'}</b>\n`;
    messageText += `• តម្លៃ / Price: <b>$${data.price || '0'}</b>\n`;
    messageText += `• ទីតាំង / Location: ${data.location || 'N/A'}\n`;
    messageText += `• 📍 Google Maps: ${data.mapLink || 'N/A'}\n`;

    if (data.landSize) messageText += `• ទំហំដី / Land Size: ${data.landSize}\n`;
    if (data.houseSize) messageText += `• ទំហំផ្ទះ / House Size: ${data.houseSize}\n`;
    if (data.frontSpace) messageText += `• សល់មុខ / Front Space: ${data.frontSpace}\n`;
    if (data.backSpace) messageText += `• សល់ក្រោយ / Back Space: ${data.backSpace}\n`;
    if (data.bedrooms && data.bedrooms !== 'មិនកំណត់') messageText += `• បន្ទប់គេង / Bedrooms: ${data.bedrooms}\n`;
    if (data.bathrooms && data.bathrooms !== 'មិនកំណត់') messageText += `• បន្ទប់ទឹក / Bathrooms: ${data.bathrooms}\n`;
    if (data.direction && data.direction !== 'មិនកំណត់') messageText += `• ទិស / Direction: ${data.direction}\n`;

    if (data.listingType === 'ជួល' || data.listingType === 'For Rent') {
      messageText += `\n<b>📝 លក្ខខណ្ឌជួល / Rental Terms:</b>\n`;
      messageText += `• ប្រាក់កក់ / Deposit: ${depositDisplay}\n`;
      messageText += `• ថ្លៃឈ្នួល / Rent Fee: ${data.rentFee || 'N/A'}\n`;
      messageText += `• កុងត្រា / Contract: ${data.contract || 'N/A'}\n`;
    } else if (data.listingType === 'លក់' || data.listingType === 'For Sale') {
      messageText += `\n<b>📜 លក្ខខណ្ឌលក់ / Sale Terms:</b>\n`;
      messageText += `• ប្លង់កម្មសិទ្ធ / Certificate: ${certDisplay}\n`;
    }

    if (data.description) {
      messageText += `\n<b>📝 សម្គាល់បន្ថែម / Additional Notes:</b>\n${data.description}\n`;
    }

    messageText += `\n<b>📩 បញ្ជូនដោយ / Submitted By:</b> ${data.submittedBy || 'Web Form'}`;

    if (files.length === 1) {
      // Single photo payload
      const formData = new FormData();
      formData.append('chat_id', CHAT_ID);
      if (PROPERTY_TOPIC_ID) formData.append('message_thread_id', PROPERTY_TOPIC_ID);
      formData.append('caption', messageText);
      formData.append('parse_mode', 'HTML');
      formData.append('photo', files[0].buffer, { filename: files[0].originalname });

      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, formData, {
        headers: formData.getHeaders()
      });
    } else if (files.length > 1) {
      // Multi-photo Media Group payload
      const formData = new FormData();
      formData.append('chat_id', CHAT_ID);
      if (PROPERTY_TOPIC_ID) formData.append('message_thread_id', PROPERTY_TOPIC_ID);

      const mediaGroup = files.map((file, index) => {
        const attachName = `photo_${index}`;
        formData.append(attachName, file.buffer, { filename: file.originalname });
        return {
          type: 'photo',
          media: `attach://${attachName}`,
          caption: index === 0 ? messageText : '',
          parse_mode: index === 0 ? 'HTML' : undefined
        };
      });

      formData.append('media', JSON.stringify(mediaGroup));

      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMediaGroup`, formData, {
        headers: formData.getHeaders()
      });
    } else {
      // Text-only payload fallback
      const payload = {
        chat_id: CHAT_ID,
        text: messageText,
        parse_mode: 'HTML'
      };
      if (PROPERTY_TOPIC_ID) payload.message_thread_id = Number(PROPERTY_TOPIC_ID);

      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, payload);
    }

    return res.status(200).json({ success: true, message: 'Property submitted successfully!' });

  } catch (error) {
    console.error('Property Submission Error:', error.response?.data || error.message);
    return res.status(500).json({ 
      success: false, 
      error: error.response?.data?.description || 'Failed to submit property listing.' 
    });
  }
});

app.listen(port, () => {
  console.log(`Twenty5Realty backend running on port ${port}`);
});
