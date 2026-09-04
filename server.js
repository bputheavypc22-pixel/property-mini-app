const express = require('express');
const multer = require('multer');
const path = require('path');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Environment configuration variables matching your Render dashboard
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Ensure CHAT_ID and TOPIC_IDs are correctly parsed
const RAW_CHAT_ID = process.env.TELEGRAM_GROUP_ID;
const CHAT_ID = !isNaN(RAW_CHAT_ID) ? Number(RAW_CHAT_ID) : RAW_CHAT_ID;

const RAW_TOPIC_ID = process.env.PROPERTY_TOPIC_ID;
const TOPIC_ID = RAW_TOPIC_ID && !isNaN(RAW_TOPIC_ID) ? Number(RAW_TOPIC_ID) : null;

// Parse Client Inquiry Topic ID explicitly
const RAW_CLIENT_TOPIC_ID = process.env.CLIENT_TOPIC_ID;
const CLIENT_TOPIC_ID = RAW_CLIENT_TOPIC_ID && !isNaN(RAW_CLIENT_TOPIC_ID) ? Number(RAW_CLIENT_TOPIC_ID) : null;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Formats property listing data into an HTML summary card in Khmer for Telegram.
 */
function generatePropertyTelegramCard(data) {
  let card = `🏠 <b>ការចុះបញ្ជីអចលនទ្រព្យថ្មី (NEW PROPERTY LISTING)</b>\n\n`;

  // --- Property Core Details ---
  card += `📌 <b>ព័ត៌មានអចលនទ្រព្យ</b>\n`;
  
  const propType = data.propertyType || '';
  const listType = data.listingType || '';
  card += `🏠<b>${propType}${propType && listType ? ' ' : ''}${listType}</b>\n`;
  
  card += `📍<b>ទីតាំង:</b> ${data.location || 'មិនមាន'}\n`;
  card += `• <b>តម្លៃ        :</b> $${data.price ? Number(data.price).toLocaleString() : 'មិនមាន'}\n`;
  card += `• <b>ទំហំដី      :</b> ${data.landSize || 'មិនមាន'}\n`;
  card += `• <b>ទំហំផ្ទះ     :</b> ${data.houseSize || 'មិនមាន'}\n`;

  const front = data.frontSpace || 'មិនមាន';
  const back = data.backSpace || 'មិនមាន';
  card += `• <b>សល់មុខផ្ទះ:</b> ${front}  | <b>សល់ក្រោយ:</b> ${back}\n`;

  const bed = data.bedrooms && data.bedrooms !== 'មិនកំណត់' ? data.bedrooms : 'មិនមាន';
  const bath = data.bathrooms && data.bathrooms !== 'មិនកំណត់' ? data.bathrooms : 'មិនមាន';
  card += `• <b>បន្ទប់គេង  :</b> ${bed}  | <b>បន្ទប់ទឹក    :</b> ${bath}\n`;

  const dir = data.direction && data.direction !== 'មិនកំណត់' ? data.direction : 'មិនមាន';
  card += `• <b>ទិសបែទៅ  :</b> ${dir}\n`;

  // --- Rental / Sale Conditions ---
  const isRent = data.listingType === 'ជួល' || data.listingType === 'For Rent';
  const isSale = data.listingType === 'លក់' || data.listingType === 'For Sale';

  if (isRent) {
    const dep = data.deposit || 'មិនមាន';
    const rent = data.rentFee || 'មិនមាន';
    const con = data.contract || 'មិនមាន';
    card += `• <b>លក្ខខណ្ឌ៖</b>\nកក់ ${dep}  | បង់ ${rent} | កុងត្រា ${con}\n`;
  } else if (isSale && data.certificate) {
    card += `• <b>លក្ខខណ្ឌ៖</b>\n${data.certificate} (Title/Certificate)\n`;
  } else {
    card += `• <b>លក្ខខណ្ឌ៖</b> មិនមាន\n`;
  }

  card += `<b>Property ID:</b> \n\n`;

  // --- Additional Notes ---
  card += `📝 <b>សម្គាល់បន្ថែម</b>\n`;
  card += `${data.description || 'មិនមាន'}\n`;
  card += `———————————\n`;

  // --- Owner Information ---
  card += `👤 <b>ព័ត៌មានម្ចាស់អចលនទ្រព្យ</b>\n`;
  card += `• <b>ឈ្មោះ:</b> ${data.ownerName || 'មិនមាន'}\n`;
  card += `• <b>Tel 1:</b> ${data.tel1 || 'មិនមាន'}\n`;
  card += `• <b>Tel 2:</b> ${data.tel2 || 'មិនមាន'}\n`;
  card += `• <b>Telegram:</b> ${data.telegram || 'មិនមាន'}\n`;
  
  if (data.mapLink) {
    card += `• <b>Google Maps:</b> ${data.mapLink}\n`;
  } else {
    card += `• <b>Google Maps:</b> មិនមាន\n`;
  }

  card += `\n`;

  // --- Submission Details ---
  if (data.submittedBy) {
    card += `<b>Submitted by:</b> ${data.submittedBy}\n`;
  }

  const now = new Date();
  const options = {
    timeZone: 'Asia/Phnom_Penh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  };
  card += `<b>Submitted Date:</b> ${now.toLocaleString('en-US', options)}`;

  return card;
}

/**
 * Formats client inquiry data into an HTML summary card for Telegram.
 */
function generateClientInquiryCard(data) {
  let card = `🔍 <b>ការចុះបញ្ជីតម្រូវការអតិថិជន (NEW CLIENT INQUIRY)</b>\n\n`;

  card += `📌 <b>ព័ត៌មានតម្រូវការ</b>\n`;
  const pType = data.propertyType || '';
  const lType = data.listingType || '';
  card += `🏠<b>${pType}${pType && lType ? ' ' : ''}${lType}</b>\n`;
  card += `📍<b>ទីតាំងចង់បាន:</b> ${data.targetLocation || 'មិនមាន'}\n`;
  card += `• <b>ថវិកា (Budget)  :</b> $${data.budget ? Number(data.budget).toLocaleString() : 'មិនមាន'}\n`;

  if (data.listingType === 'ជួល' || data.listingType === 'For Rent') {
    card += `• <b>រយៈពេលកុងត្រា :</b> ${data.preferredTerm || 'មិនមាន'}\n`;
  }

  const bed = data.bedrooms && data.bedrooms !== 'មិនកំណត់' ? data.bedrooms : 'មិនមាន';
  const bath = data.bathrooms && data.bathrooms !== 'មិនកំណត់' ? data.bathrooms : 'មិនមាន';
  card += `• <b>បន្ទប់គេង  :</b> ${bed}  | <b>បន្ទប់ទឹក    :</b> ${bath}\n\n`;

  card += `📝 <b>សម្គាល់បន្ថែម</b>\n`;
  card += `${data.description || 'មិនមាន'}\n`;
  card += `———————————\n`;

  card += `👤 <b>ព័ត៌មានអតិថិជន</b>\n`;
  card += `• <b>ឈ្មោះ:</b> ${data.clientName || 'មិនមាន'}\n`;
  card += `• <b>Tel 1:</b> ${data.tel1 || 'មិនមាន'}\n`;
  card += `• <b>Tel 2:</b> ${data.tel2 || 'មិនមាន'}\n`;
  card += `• <b>Telegram:</b> ${data.telegram || 'មិនមាន'}\n\n`;

  if (data.submittedBy) {
    card += `<b>Submitted by:</b> ${data.submittedBy}\n`;
  }

  const now = new Date();
  const options = {
    timeZone: 'Asia/Phnom_Penh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  };
  card += `<b>Submitted Date:</b> ${now.toLocaleString('en-US', options)}`;

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
        const welcomeMessage = 
          `សូមស្វាគមន៍មកកាន់ Twenty5Realty! សូមចុច Open Form ដើម្បីបំពេញបែបបទ。\n\n` +
          `Welcome to Twenty5Realty! Please Click Open Form to get the Form.`;

        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: welcomeMessage,
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

// API Route for Property Registration (UNTOUCHED)
app.post('/api/register-property', upload.array('photos', 10), async (req, res) => {
  try {
    const data = req.body;
    const files = req.files || [];
    const messageText = generatePropertyTelegramCard(data);

    if (files.length === 0) {
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

// API Route for Client Inquiry (Targeting CLIENT_TOPIC_ID)
app.post('/api/client-inquiry', async (req, res) => {
  try {
    const data = req.body;
    const messageText = generateClientInquiryCard(data);

    const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const payload = {
      chat_id: CHAT_ID,
      text: messageText,
      parse_mode: 'HTML',
      disable_web_page_preview: false
    };

    // Use CLIENT_TOPIC_ID specifically for client inquiries
    if (CLIENT_TOPIC_ID) {
      payload.message_thread_id = CLIENT_TOPIC_ID;
    }

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

    res.json({ success: true, message: 'Inquiry submitted successfully!' });
  } catch (error) {
    console.error('Error submitting client inquiry:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
