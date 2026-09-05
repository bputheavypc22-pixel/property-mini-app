const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// Telegram Bot Configuration (Get these from Render Environment Variables or replace directly)
const BOT_TOKEN = process.env.BOT_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN';
const CHAT_ID = process.env.CHAT_ID || 'YOUR_TELEGRAM_CHAT_ID_OR_CHANNEL';

// 1. Configure Body Parsers for large payloads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static frontend files (HTML, CSS, JS, Images)
app.use(express.static(path.join(__dirname, 'public')));

// 2. Configure Multer in-memory storage for handling up to 10 photos
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per image
    files: 10 // Max 10 images
  }
});

// 3. Health Check / Keep-Alive Route for UptimeRobot
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// 4. Form Submission Endpoint
app.post('/api/submit', upload.array('photos', 10), async (req, res) => {
  try {
    const data = req.body;
    const files = req.files || [];

    // Format listing message for Telegram
    let message = `🏠 <b>NEW PROPERTY LISTING</b>\n`;
    message += `----------------------------\n`;
    message += `👤 <b>Owner:</b> ${data.ownerName || 'N/A'}\n`;
    message += `📞 <b>Tel 1:</b> ${data.tel1 || 'N/A'}\n`;
    if (data.tel2) message += `📞 <b>Tel 2:</b> ${data.tel2}\n`;
    if (data.telegram) message += `✈️ <b>Telegram:</b> ${data.telegram}\n`;
    message += `----------------------------\n`;
    message += `📌 <b>Purpose:</b> ${data.listingType || 'N/A'}\n`;
    message += `🏢 <b>Type:</b> ${data.propertyType || 'N/A'}\n`;
    message += `💰 <b>Price:</b> $${data.price || '0'}\n`;
    message += `📍 <b>Location:</b> ${data.location || 'N/A'}\n`;
    if (data.mapLink) message += `🗺️ <b>Map Link:</b> ${data.mapLink}\n`;
    
    if (data.landSize) message += `📐 <b>Land Size:</b> ${data.landSize}\n`;
    if (data.houseSize) message += `🏠 <b>House Size:</b> ${data.houseSize}\n`;
    if (data.bedrooms && data.bedrooms !== 'មិនកំណត់') message += `🛏️ <b>Bedrooms:</b> ${data.bedrooms}\n`;
    if (data.bathrooms && data.bathrooms !== 'មិនកំណត់') message += `🚿 <b>Bathrooms:</b> ${data.bathrooms}\n`;
    if (data.direction && data.direction !== 'មិនកំណត់') message += `🧩 <b>Direction:</b> ${data.direction}\n`;

    // Conditional Rent/Sale Details
    if (data.listingType === 'ជួល' || data.listingType === 'For Rent') {
      const depositVal = (data.deposit === 'ផ្សេងៗ' || data.deposit === 'Other') ? data.depositOther : data.deposit;
      if (depositVal) message += `💵 <b>Deposit:</b> ${depositVal}\n`;
      if (data.rentFee) message += `💳 <b>Fee Terms:</b> ${data.rentFee}\n`;
      if (data.contract) message += `📜 <b>Contract:</b> ${data.contract}\n`;
    } else if (data.listingType === 'លក់' || data.listingType === 'For Sale') {
      const certVal = (data.certificate === 'ប្រភេទផ្សេង' || data.certificate === 'Other type') ? data.certOther : data.certificate;
      if (certVal) message += `📄 <b>Certificate:</b> ${certVal}\n`;
    }

    if (data.description) message += `📝 <b>Notes:</b> ${data.description}\n`;
    message += `----------------------------\n`;
    message += `📤 <b>Submitted By:</b> ${data.submittedBy || 'Web User'}`;

    // Send payload to Telegram
    if (files.length === 0) {
      // Single text message if no photos are attached
      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'HTML'
      });
    } else if (files.length === 1) {
      // Single photo with caption
      const formData = new FormData();
      formData.append('chat_id', CHAT_ID);
      formData.append('caption', message);
      formData.append('parse_mode', 'HTML');
      formData.append('photo', files[0].buffer, { filename: files[0].originalname });

      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, formData, {
        headers: formData.getHeaders()
      });
    } else {
      // Media Group for multiple photos (up to 10)
      const formData = new FormData();
      formData.append('chat_id', CHAT_ID);

      const mediaGroup = files.map((file, index) => {
        const attachName = `photo_${index}`;
        formData.append(attachName, file.buffer, { filename: file.originalname });

        return {
          type: 'photo',
          media: `attach://${attachName}`,
          caption: index === 0 ? message : '', // Attach caption to first photo only
          parse_mode: 'HTML'
        };
      });

      formData.append('media', JSON.stringify(mediaGroup));

      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMediaGroup`, formData, {
        headers: formData.getHeaders()
      });
    }

    return res.status(200).json({ success: true, message: 'Submitted successfully' });

  } catch (error) {
    console.error('Server Processing Error:', error?.response?.data || error.message);
    return res.status(500).json({ 
      error: 'Failed to process listing on server.', 
      details: error?.response?.data?.description || error.message 
    });
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
