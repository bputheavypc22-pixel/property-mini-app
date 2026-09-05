const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const path = require('path');

const app = express();
const port = process.env.PORT || 10000;

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

// Use memory storage for uploaded photos
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit per image
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve property.html at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'property.html'));
});

// Endpoint to handle form submissions
app.post('/api/submit', upload.array('photos', 10), async (req, res) => {
  try {
    if (!BOT_TOKEN || !CHAT_ID) {
      return res.status(500).json({ 
        success: false, 
        error: 'BOT_TOKEN or CHAT_ID environment variables are missing on the server.' 
      });
    }

    const data = req.body;
    const files = req.files || [];

    // Format deposit display
    let depositDisplay = data.deposit || 'N/A';
    if ((data.deposit === '`ផ្សេងៗ` || data.deposit === 'Other') && data.depositOther) {
      depositDisplay = `${data.deposit} (${data.depositOther})`;
    }

    // Format certificate display
    let certDisplay = data.certificate || 'N/A';
    if ((data.certificate === 'ប្រភេទផ្សេង' || data.certificate === 'Other type') && data.certOther) {
      certDisplay = `${data.certificate} (${data.certOther})`;
    }

    // Build Telegram message caption
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

    // Send photo(s) to Telegram
    if (files.length === 1) {
      // Single photo upload
      const formData = new FormData();
      formData.append('chat_id', CHAT_ID);
      formData.append('caption', messageText);
      formData.append('parse_mode', 'HTML');
      formData.append('photo', files[0].buffer, { filename: files[0].originalname });

      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, formData, {
        headers: formData.getHeaders()
      });
    } else if (files.length > 1) {
      // Multiple photos (sendMediaGroup)
      const formData = new FormData();
      formData.append('chat_id', CHAT_ID);

      const mediaGroup = files.map((file, index) => {
        const attachName = `photo_${index}`;
        formData.append(attachName, file.buffer, { filename: file.originalname });
        
        return {
          type: 'photo',
          media: `attach://${attachName}`,
          // Attach text caption to the first image in media group
          caption: index === 0 ? messageText : '',
          parse_mode: index === 0 ? 'HTML' : undefined
        };
      });

      formData.append('media', JSON.stringify(mediaGroup));

      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMediaGroup`, formData, {
        headers: formData.getHeaders()
      });
    } else {
      // Text-only fallback if no files attached
      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        chat_id: CHAT_ID,
        text: messageText,
        parse_mode: 'HTML'
      });
    }

    return res.status(200).json({ success: true, message: 'Property submitted successfully!' });

  } catch (error) {
    console.error('Telegram API Error:', error.response?.data || error.message);
    return res.status(500).json({ 
      success: false, 
      error: error.response?.data?.description || 'Failed to process submission.' 
    });
  }
});

app.listen(port, () => {
  console.log(`Twenty5Realty backend running on port ${port}`);
});
