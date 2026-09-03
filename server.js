const express = require('express');
const multer = require('multer');
const path = require('path');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Environment configuration variables
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN';
const CHAT_ID = process.env.CHAT_ID || 'YOUR_TELEGRAM_CHAT_ID'; // e.g., -1001234567890
const TOPIC_ID = process.env.TOPIC_ID || null; // Topic thread ID (optional)

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Formats all submitted property form data into an HTML summary card for Telegram.
 */
function generatePropertyTelegramCard(data) {
  let card = `<b>🏠 NEW PROPERTY LISTING SUBMITTED</b>\n\n`;

  // --- Owner Information ---
  card += `<b>👤 OWNER INFORMATION</b>\n`;
  card += `• <b>Name:</b> ${data.ownerName || 'N/A'}\n`;
  card += `• <b>Phone 1:</b> ${data.tel1 || 'N/A'}\n`;
  if (data.tel2) {
    card += `• <b>Phone 2:</b> ${data.tel2}\n`;
  }
  if (data.telegram) {
    card += `• <b>Telegram:</b> ${data.telegram}\n`;
  }

  // --- Property Core Details ---
  card += `\n<b>📌 PROPERTY DETAILS</b>\n`;
  card += `• <b>Purpose:</b> ${data.listingType || 'N/A'}\n`;
  card += `• <b>Type:</b> ${data.propertyType || 'N/A'}\n`;
  card += `• <b>Price:</b> $${data.price ? Number(data.price).toLocaleString() : 'N/A'}\n`;
  card += `• <b>Location:</b> ${data.location || 'N/A'}\n`;
  if (data.mapLink) {
    card += `• <b>Google Maps:</b> <a href="${data.mapLink}">View Location</a>\n`;
  }

  // --- Dimensions & Specifications ---
  const dimensions = [];
  if (data.landSize) dimensions.push(`<b>Land:</b> ${data.landSize}`);
  if (data.houseSize) dimensions.push(`<b>House:</b> ${data.houseSize}`);
  if (data.frontSpace) dimensions.push(`<b>Front:</b> ${data.frontSpace}`);
  if (data.backSpace) dimensions.push(`<b>Back:</b> ${data.backSpace}`);

  if (dimensions.length > 0) {
    card += `\n<b>📐 SPECIFICATIONS</b>\n`;
    dimensions.forEach(dim => {
      card += `• ${dim}\n`;
    });
  }

  // --- Features & Direction ---
  const specs = [];
  if (data.bedrooms && data.bedrooms !== 'មិនកំណត់') specs.push(`🛏️ ${data.bedrooms} Bed`);
  if (data.bathrooms && data.bathrooms !== 'មិនកំណត់') specs.push(`🚿 ${data.bathrooms} Bath`);
  if (data.direction && data.direction !== 'មិនកំណត់') specs.push(`🧭 ${data.direction}`);

  if (specs.length > 0) {
    card += `• <b>Features:</b> ${specs.join(' | ')}\n`;
  }

  // --- Rental Terms (Conditional) ---
  const isRent = data.listingType === 'ជួល' || data.listingType === 'For Rent';
  if (isRent) {
    card += `\n<b>🔑 RENTAL TERMS</b>\n`;
    if (data.deposit) card += `• <b>Deposit:</b> ${data.deposit}\n`;
    if (data.rentFee) card += `• <b>Payment:</b> ${data.rentFee}\n`;
    if (data.contract) card += `• <b>Contract:</b> ${data.contract}\n`;
  }

  // --- Property Certificate / Title (Conditional for Sale) ---
  const isSale = data.listingType === 'លក់' || data.listingType === 'For Sale';
  if (isSale && data.certificate) {
    card += `\n<b>📜 LEGAL & TITLE</b>\n`;
    card += `• <b>Certificate:</b> ${data.certificate}\n`;
  }

  // --- Additional Notes ---
  if (data.description) {
    card += `\n<b>📝 ADDITIONAL NOTES</b>\n`;
    card += `${data.description}\n`;
  }

  // --- Submitter Info ---
  if (data.submittedBy) {
    card += `\n<b>📥 SUBMITTED BY</b>\n`;
    card += `• ${data.submittedBy}\n`;
  }

  return card;
}

// API Route for Property Registration
app.post('/api/register-property', upload.array('photos', 10), async (req, res) => {
  try {
    const data = req.body;
    const files = req.files || [];
    const messageText = generatePropertyTelegramCard(data);

    if (files.length === 0) {
      // Send text message directly
      const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
      const payload = {
        chat_id: CHAT_ID,
        text: messageText,
        parse_mode: 'HTML',
        disable_web_page_preview: false
      };
      if (TOPIC_ID) payload.message_thread_id = Number(TOPIC_ID);

      const resp = await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const resJson = await resp.json();

      if (!resJson.ok) throw new Error(resJson.description || 'Telegram API Error');
    } else if (files.length === 1) {
      // Send single photo with caption using native FormData & Blob
      const form = new FormData();
      form.append('chat_id', CHAT_ID);
      if (TOPIC_ID) form.append('message_thread_id', TOPIC_ID);
      form.append('caption', messageText);
      form.append('parse_mode', 'HTML');

      const blob = new Blob([files[0].buffer], { type: files[0].mimetype });
      form.append('photo', blob, files[0].originalname);

      const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        body: form
      });
      const resJson = await resp.json();

      if (!resJson.ok) throw new Error(resJson.description || 'Telegram API Error');
    } else {
      // Send multiple photos as a Media Group using native FormData & Blob
      const mediaGroup = files.map((file, idx) => ({
        type: 'photo',
        media: `attach://file_${idx}`,
        caption: idx === 0 ? messageText : '',
        parse_mode: 'HTML'
      }));

      const form = new FormData();
      form.append('chat_id', CHAT_ID);
      if (TOPIC_ID) form.append('message_thread_id', TOPIC_ID);
      form.append('media', JSON.stringify(mediaGroup));

      files.forEach((file, idx) => {
        const blob = new Blob([file.buffer], { type: file.mimetype });
        form.append(`file_${idx}`, blob, file.originalname);
      });

      const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMediaGroup`, {
        method: 'POST',
        body: form
      });
      const resJson = await resp.json();

      if (!resJson.ok) throw new Error(resJson.description || 'Telegram API Error');
    }

    res.json({ success: true, message: 'Property listed successfully!' });
  } catch (error) {
    console.error('Error submitting property:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
