const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const path = require('path');

const app = express();
const port = process.env.PORT || 10000;

// Environment variables mapped directly to your Render setup
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_GROUP_ID || process.env.CHAT_ID;
const PROPERTY_TOPIC_ID = process.env.PROPERTY_TOPIC_ID;
const CLIENT_TOPIC_ID = process.env.CLIENT_TOPIC_ID;

// Parse incoming request payloads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static assets
app.use(express.static(path.join(__dirname, 'public')));

// Lightweight Telegram /start handler
if (BOT_TOKEN) {
  let lastUpdateId = 0;
  const pollTelegram = async () => {
    try {
      const res = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`, {
        params: { offset: lastUpdateId + 1, timeout: 5 }
      });
      if (res.data?.ok && res.data.result.length > 0) {
        for (const update of res.data.result) {
          lastUpdateId = update.update_id;
          if (update.message?.text === '/start') {
            await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
              chat_id: update.message.chat.id,
              text: `សូមស្វាគមន៍មកកាន់ Twenty5Realty! សូមចុច Open Form ដើម្បីបំពេញបែបបទ。\n\nWelcome to Twenty5Realty! Please Click Open Form to get the Form.`
            });
          }
        }
      }
    } catch (err) {
      // Ignore polling timeout errors
    } finally {
      setTimeout(pollTelegram, 2000);
    }
  };
  pollTelegram();
} else {
  console.error("CRITICAL ERROR: TELEGRAM_BOT_TOKEN is missing on Render settings!");
}

// Memory storage for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// HTML Page Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'property.html'));
});

app.get('/client-inquiry', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'client-inquiry.html'));
});

// ==========================================
// 1. CLIENT INQUIRY ENDPOINT
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
// 2. PROPERTY LISTING ENDPOINT
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

    // Format Deposit & Contract Terms
    let depositDisplay = data.deposit || 'N/A';
    if ((data.deposit === 'ផ្សេងៗ' || data.deposit === 'Other') && data.depositOther) {
      depositDisplay = `${data.deposit} (${data.depositOther})`;
    }

    let certDisplay = data.certificate || 'N/A';
    if ((data.certificate === 'ប្រភេទផ្សេង' || data.certificate === 'Other type') && data.certOther) {
      certDisplay = `${data.certificate} (${data.certOther})`;
    }

    let termsString = '';
    if (data.listingType === 'ជួល' || data.listingType === 'For Rent') {
      termsString = `កក់ ${depositDisplay} | បង់ ${data.rentFee || 'N/A'} | កុងត្រា ${data.contract || 'N/A'}`;
    } else if (data.listingType === 'លក់' || data.listingType === 'For Sale') {
      termsString = `ប្លង់កម្មសិទ្ធ: ${certDisplay}`;
    } else {
      termsString = 'N/A';
    }

    // Build Layout
    let messageText = `🏠 <b>ការចុះបញ្ជីអចលនទ្រព្យថ្មី (NEW PROPERTY LISTING)</b>\n\n`;
    
    messageText += `📌 <b>ព័ត៌មានអចលនទ្រព្យ</b>\n`;
    messageText += `🏠 <b>${data.propertyType || 'N/A'} ${data.listingType || ''}</b>\n`;
    messageText += `📍 <b>ទីតាំង:</b> ${data.location || 'N/A'}\n`;
    messageText += `• <b>តម្លៃ</b> : $${data.price || '0'}\n`;
    
    if (data.landSize) messageText += `• <b>ទំហំដី</b> : ${data.landSize}\n`;
    if (data.houseSize) messageText += `• <b>ទំហំផ្ទះ</b> : ${data.houseSize}\n`;
    
    const front = data.frontSpace || 'N/A';
    const back = data.backSpace || 'N/A';
    messageText += `• <b>សល់មុខផ្ទះ:</b> ${front} | <b>សល់ក្រោយ:</b> ${back}\n`;

    const bed = (data.bedrooms && data.bedrooms !== 'មិនកំណត់') ? data.bedrooms : 'N/A';
    const bath = (data.bathrooms && data.bathrooms !== 'មិនកំណត់') ? data.bathrooms : 'N/A';
    messageText += `• <b>បន្ទប់គេង</b> : ${bed} | <b>បន្ទប់ទឹក</b> : ${bath}\n`;

    if (data.direction && data.direction !== 'មិនកំណត់') {
      messageText += `• <b>ទិសបែរទៅ</b> : ${data.direction}\n`;
    }

    messageText += `• <b>លក្ខខណ្ឌ:</b>\n${termsString}\n`;
    messageText += `<b>Property ID:</b> ${data.propertyId || ''}\n\n`;

    messageText += `📝 <b>សម្គាល់បន្ថែម</b>\n`;
    messageText += `${data.description || 'N/A'}\n`;
    messageText += `-----------------------------------\n\n`;

    messageText += `👤 <b>ព័ត៌មានម្ចាស់អចលនទ្រព្យ</b>\n`;
    messageText += `• <b>ឈ្មោះ:</b> ${data.ownerName || 'N/A'}\n`;
    messageText += `• <b>Tel 1:</b> ${data.tel1 || 'N/A'}\n`;
    if (data.tel2) messageText += `• <b>Tel 2:</b> ${data.tel2}\n`;
    if (data.telegram) messageText += `• <b>Telegram:</b> ${data.telegram}\n`;
    if (data.mapLink) messageText += `• <b>Google Maps:</b> ${data.mapLink}\n`;

    const now = new Date();
    const formattedDate = now.toLocaleString('en-GB', { timeZone: 'Asia/Phnom_Penh' });
    messageText += `\n<b>Submitted by:</b> ${data.submittedBy || 'Web Form'}\n`;
    messageText += `<b>Submitted Date:</b> ${formattedDate}`;

    if (files.length === 1) {
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

// Fallback 404 Handler for Unmatched API Requests
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'API route not found' });
});

app.listen(port, () => {
  console.log(`Twenty5Realty backend running on port ${port}`);
});
