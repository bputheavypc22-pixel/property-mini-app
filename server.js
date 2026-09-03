const express = require('express');
const multer = require('multer');
const path = require('path');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Environment configuration variables matching your Render dashboard
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Ensure CHAT_ID and TOPIC_ID are correctly parsed
const RAW_CHAT_ID = process.env.TELEGRAM_GROUP_ID;
const CHAT_ID = !isNaN(RAW_CHAT_ID) ? Number(RAW_CHAT_ID) : RAW_CHAT_ID;

const RAW_TOPIC_ID = process.env.PROPERTY_TOPIC_ID;
const TOPIC_ID = RAW_TOPIC_ID && !isNaN(RAW_TOPIC_ID) ? Number(RAW_TOPIC_ID) : null;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Formats all submitted property form data into an HTML summary card in Khmer for Telegram.
 */
function generatePropertyTelegramCard(data) {
  let card = `<b>🏠 ការចុះបញ្ជីអចលនទ្រព្យថ្មី (NEW PROPERTY LISTING)</b>\n\n`;

  // --- Owner Information ---
  card += `<b>👤 ព័ត៌មានម្ចាស់អចលនទ្រព្យ</b>\n`;
  card += `• <b>ឈ្មោះម្ចាស់:</b> ${data.ownerName || 'មិនមាន'}\n`;
  card += `• <b>លេខទូរស័ព្ទទី១:</b> ${data.tel1 || 'មិនមាន'}\n`;
  if (data.tel2) {
    card += `• <b>លេខទូរស័ព្ទទី២:</b> ${data.tel2}\n`;
  }
  if (data.telegram) {
    card += `• <b>Telegram ម្ចាស់:</b> ${data.telegram}\n`;
  }

  // --- Property Core Details ---
  card += `\n<b>📌 ព័ត៌មានអចលនទ្រព្យ</b>\n`;
  card += `• <b>គោលបំណង:</b> ${data.listingType || 'មិនមាន'}\n`;
  card += `• <b>ប្រភេទអចលនទ្រព្យ:</b> ${data.propertyType || 'មិនមាន'}\n`;
  card += `• <b>តម្លៃ:</b> $${data.price ? Number(data.price).toLocaleString() : 'មិនមាន'}\n`;
  card += `• <b>ទីតាំង/អាសយដ្ឋាន:</b> ${data.location || 'មិនមាន'}\n`;
  if (data.mapLink) {
    card += `• <b>លីង Google Maps:</b> <a href="${data.mapLink}">មើលទីតាំងនៅលើផែនទី</a>\n`;
  }

  // --- Dimensions & Specifications ---
  const dimensions = [];
  if (data.landSize) dimensions.push(`<b>ទំហំដី:</b> ${data.landSize}`);
  if (data.houseSize) dimensions.push(`<b>ទំហំផ្ទះ:</b> ${data.houseSize}`);
  if (data.frontSpace) dimensions.push(`<b>សល់មុខផ្ទះ:</b> ${data.frontSpace}`);
  if (data.backSpace) dimensions.push(`<b>សល់ក្រោយផ្ទះ:</b> ${data.backSpace}`);

  if (dimensions.length > 0) {
    card += `\n<b>📐 ទំហំ និងលក្ខណៈបច្ចេកទេស</b>\n`;
    dimensions.forEach(dim => {
      card += `• ${dim}\n`;
    });
  }

  // --- Features & Direction ---
  const specs = [];
  if (data.bedrooms && data.bedrooms !== 'មិនកំណត់') specs.push(`🛏️ បន្ទប់គេង: ${data.bedrooms}`);
  if (data.bathrooms && data.bathrooms !== 'មិនកំណត់') specs.push(`🚿 បន្ទប់ទឹក: ${data.bathrooms}`);
  if (data.direction && data.direction !== 'មិនកំណត់') specs.push(`🧭 ទិស: ${data.direction}`);

  if (specs.length > 0) {
    card += `• <b>បន្ទប់ និងទិស:</b> ${specs.join(' | ')}\n`;
  }

  // --- Rental Terms (Conditional) ---
  const isRent = data.listingType === 'ជួល' || data.listingType === 'For Rent';
  if (isRent) {
    card += `\n<b>🔑 លក្ខខណ្ឌនៃការជួល</b>\n`;
    if (data.deposit) card += `• <b>ប្រាក់កក់:</b> ${data.deposit}\n`;
    if (data.rentFee) card += `• <b>បង់ថ្លៃឈ្នួល:</b> ${data.rentFee}\n`;
    if (data.contract) card += `• <b>កុងត្រា:</b> ${data.contract}\n`;
  }

  // --- Property Certificate / Title (Conditional for Sale) ---
  const isSale = data.listingType === 'លក់' || data.listingType === 'For Sale';
  if (isSale && data.certificate) {
    card += `\n<b>📜 ប្លង់កម្មសិទ្ធ</b>\n`;
    card += `• <b>ប្រភេទប្លង់:</b> ${data.certificate}\n`;
  }

  // --- Additional Notes ---
  if (data.description) {
    card += `\n<b>📝 សម្គាល់បន្ថែម</b>\n`;
    card += `${data.description}\n`;
  }

  // --- Submitter Info ---
  if (data.submittedBy) {
    card += `\n<b>📥 បញ្ជូនទិន្នន័យដោយ</b>\n`;
    card += `• ${data.submittedBy}\n`;
  }

  return card;
}

// Telegram Webhook Handler to respond to /start
app.post('/webhook', async (req, res) => {
  try {
    const update = req.body;
    if (update.message && update.message.text) {
      const text = update.message.text;
      const chatId = update.message.chat.id;

      if (text.startsWith('/start')) {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: '👋 ជម្រាបសួរ! សូមស្វាគមន៍មកកាន់ Twenty5Realty Bot។\n\nលោកអ្នកអាចប្រើប្រាស់ Mini App ឬ Form ដើម្បីបញ្ជូនទិន្នន័យអចលនទ្រព្យបាន។',
            parse_mode: 'HTML'
          })
        });
      }
    }
    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook Error:', err);
    res.sendStatus(500);
  }
});

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
      if (TOPIC_ID) payload.message_thread_id = TOPIC_ID;

      const resp = await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const resJson = await resp.json();

      if (!resJson.ok) {
        console.error('Telegram API Error Response:', resJson);
        throw new Error(resJson.description || 'Telegram API Error');
      }
    } else if (files.length === 1) {
      // Send single photo with caption
      const form = new FormData();
      form.append('chat_id', CHAT_ID.toString());
      if (TOPIC_ID) form.append('message_thread_id', TOPIC_ID.toString());
      form.append('caption', messageText);
      form.append('parse_mode', 'HTML');

      const blob = new Blob([files[0].buffer], { type: files[0].mimetype });
      form.append('photo', blob, files[0].originalname);

      const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        body: form
      });
      const resJson = await resp.json();

      if (!resJson.ok) {
        console.error('Telegram API Error Response:', resJson);
        throw new Error(resJson.description || 'Telegram API Error');
      }
    } else {
      // Send multiple photos as a Media Group
      const mediaGroup = files.map((file, idx) => ({
        type: 'photo',
        media: `attach://file_${idx}`,
        caption: idx === 0 ? messageText : '',
        parse_mode: 'HTML'
      }));

      const form = new FormData();
      form.append('chat_id', CHAT_ID.toString());
      if (TOPIC_ID) form.append('message_thread_id', TOPIC_ID.toString());
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

      if (!resJson.ok) {
        console.error('Telegram API Error Response:', resJson);
        throw new Error(resJson.description || 'Telegram API Error');
      }
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
