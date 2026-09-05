const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 10000;

// Telegram Bot Configuration
const BOT_TOKEN = process.env.BOT_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN';
const CHAT_ID = process.env.CHAT_ID || 'YOUR_TELEGRAM_CHAT_ID_OR_CHANNEL';

// 1. Configure Body Parsers for large payloads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files from the root directory and 'public' directory if present
app.use(express.static(path.join(__dirname)));
if (fs.existsSync(path.join(__dirname, 'public'))) {
  app.use(express.static(path.join(__dirname, 'public')));
}

// 2. Multer Storage Setup (Memory Storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per image limit
    files: 10                   // Max 10 images
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('Server is active');
});

// 3. Main Form Submission Route
app.post('/api/submit', upload.array('photos', 10), async (req, res) => {
  try {
    const data = req.body;
    const files = req.files || [];

    // Format text message for Telegram
    let caption = `<b>🏠 NEW PROPERTY LISTING</b>\n\n`;
    caption += `<b>👤 Owner Details</b>\n`;
    caption += `• <b>Name:</b> ${data.ownerName || 'N/A'}\n`;
    caption += `• <b>Tel 1:</b> ${data.tel1 || 'N/A'}\n`;
    if (data.tel2) caption += `• <b>Tel 2:</b> ${data.tel2}\n`;
    if (data.telegram) caption += `• <b>Telegram:</b> ${data.telegram}\n`;

    caption += `\n<b>🏠 Property Information</b>\n`;
    caption += `• <b>Purpose:</b> ${data.listingType || 'N/A'}\n`;
    caption += `• <b>Type:</b> ${data.propertyType || 'N/A'}\n`;
    caption += `• <b>Price:</b> $${data.price || 'N/A'}\n`;
    caption += `• <b>Location:</b> ${data.location || 'N/A'}\n`;
    if (data.mapLink) caption += `• <b>Map Link:</b> ${data.mapLink}\n`;

    if (data.landSize) caption += `• <b>Land Size:</b> ${data.landSize}\n`;
    if (data.houseSize) caption += `• <b>House Size:</b> ${data.houseSize}\n`;
    if (data.frontSpace) caption += `• <b>Front Space:</b> ${data.frontSpace}\n`;
    if (data.backSpace) caption += `• <b>Back Space:</b> ${data.backSpace}\n`;
    if (data.bedrooms && data.bedrooms !== 'មិនកំណត់') caption += `• <b>Bedrooms:</b> ${data.bedrooms}\n`;
    if (data.bathrooms && data.bathrooms !== 'មិនកំណត់') caption += `• <b>Bathrooms:</b> ${data.bathrooms}\n`;
    if (data.direction && data.direction !== 'មិនកំណត់') caption += `• <b>Direction:</b> ${data.direction}\n`;

    if (data.listingType === 'ជួល' || data.listingType === 'For Rent') {
      const dep = (data.deposit === 'ផ្សេងៗ' || data.deposit === 'Other') ? data.depositOther : data.deposit;
      if (dep) caption += `• <b>Deposit:</b> ${dep}\n`;
      if (data.rentFee) caption += `• <b>Rent Fee:</b> ${data.rentFee}\n`;
      if (data.contract) caption += `• <b>Contract:</b> ${data.contract}\n`;
    } else if (data.listingType === 'លក់' || data.listingType === 'For Sale') {
      const cert = (data.certificate === 'ប្រភេទផ្សេង' || data.certificate === 'Other type') ? data.certOther : data.certificate;
      if (cert) caption += `• <b>Title/Cert:</b> ${cert}\n`;
    }

    if (data.description) caption += `\n<b>📝 Notes:</b>\n${data.description}\n`;
    if (data.submittedBy) caption += `\n<b>Submitted By:</b> ${data.submittedBy}`;

    // Send payload to Telegram
    if (files.length > 0) {
      if (files.length === 1) {
        const formData = new FormData();
        formData.append('chat_id', CHAT_ID);
        formData.append('caption', caption);
        formData.append('parse_mode', 'HTML');
        formData.append('photo', files[0].buffer, { filename: files[0].originalname });

        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, formData, {
          headers: formData.getHeaders()
        });
      } else {
        const formData = new FormData();
        formData.append('chat_id', CHAT_ID);

        const mediaArr = files.map((file, idx) => ({
          type: 'photo',
          media: `attach://file_${idx}`,
          caption: idx === 0 ? caption : '',
          parse_mode: 'HTML'
        }));

        formData.append('media', JSON.stringify(mediaArr));

        files.forEach((file, idx) => {
          formData.append(`file_${idx}`, file.buffer, { filename: file.originalname });
        });

        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMediaGroup`, formData, {
          headers: formData.getHeaders()
        });
      }
    } else {
      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        chat_id: CHAT_ID,
        text: caption,
        parse_mode: 'HTML'
      });
    }

    return res.status(200).json({ success: true, message: 'Submitted successfully' });

  } catch (error) {
    console.error('Submission Error:', error?.response?.data || error.message);
    return res.status(500).json({ error: 'Submission failed on server. Please try again.' });
  }
});

// 4. Safe fallback for routing
app.get('*', (req, res) => {
  const rootIndex = path.join(__dirname, 'index.html');
  const publicIndex = path.join(__dirname, 'public', 'index.html');

  if (fs.existsSync(rootIndex)) {
    res.sendFile(rootIndex);
  } else if (fs.existsSync(publicIndex)) {
    res.sendFile(publicIndex);
  } else {
    res.status(200).send('Twenty5 Realty Bot API is online');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
