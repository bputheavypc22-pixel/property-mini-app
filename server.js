const express = require('express');
const multer = require('multer');
const FormData = require('form-data');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Multer setup for memory storage (holds files temporarily in RAM before sending to Telegram)
const upload = multer({ storage: multer.memoryStorage() });

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// YOUR TELEGRAM BOT CONFIGURATION
const BOT_TOKEN = 'YOUR_TELEGRAM_BOT_TOKEN';
const CHAT_ID = 'YOUR_TELEGRAM_GROUP_CHAT_ID';

// API Route for Property Registration
app.post('/api/register-property', upload.array('photos', 10), async (req, res) => {
  try {
    const data = req.body;
    const files = req.files || [];

    // Formatted Caption Text
    const captionText = `
🏠 *អចលនទ្រព្យថ្មី / Property Register*
──────────────────
👤 *ឈ្មោះម្ចាស់ / Name:* ${data.name || 'N/A'}
📞 *Tel1:* ${data.tel1 || 'N/A'}
📞 *Tel2:* ${data.tel2 || 'N/A'}
💬 *Telegram:* ${data.clientTelegram || 'N/A'}
──────────────────
🎯 *គោលបំណង / Target:* ${data.target || 'N/A'}
🏗 *ប្រភេទ / Type:* ${data.propertyType || 'N/A'}
💰 *តម្លៃ / Price:* ${data.price || 'N/A'}
📍 *ទីតាំង / Location:* ${data.location || 'N/A'}
📦 *ទំហំអគារ / Building Size:* ${data.buildingSize || 'N/A'}
📐 *ទំហំដី / Land Size:* ${data.landSize || 'N/A'}
🛏 *បន្ទប់គេង / Bedrooms:* ${data.bedrooms || 'N/A'}
🛁 *បន្ទប់ទឹក / Bathrooms:* ${data.bathrooms || 'N/A'}
🧭 *ទិស / Direction:* ${data.direction || 'N/A'}
🅿️ *ទីធ្លាចំណត / Parking:* ${data.parking || 'N/A'}
──────────────────
💳 *ការបង់ប្រាក់ / Payment:* ${data.paymentTerm || 'N/A'}
💵 *ប្រាក់កក់ / Deposit:* ${data.deposit || 'N/A'}
📝 *កុងត្រា / Contract:* ${data.contract || 'N/A'}
✏️ *សម្គាល់ / Remark:* ${data.remark || 'N/A'}
🖼 *រូបភាព / Photos:* ${files.length}
──────────────────
_Submitted by: ${data.submittedBy || 'Unknown'}_
_Date: ${new Date().toLocaleString()}_
`.trim();

    if (files.length > 0) {
      const form = new FormData();
      const mediaArray = [];

      files.forEach((file, index) => {
        const attachName = `photo_${index}`;
        
        // Append raw file buffer directly to form data
        form.append(attachName, file.buffer, { filename: file.originalname });

        const mediaItem = {
          type: 'photo',
          media: `attach://${attachName}`
        };

        // Attach text caption to ONLY the first media item so it pins underneath the album
        if (index === 0) {
          mediaItem.caption = captionText;
          mediaItem.parse_mode = 'Markdown';
        }

        mediaArray.push(mediaItem);
      });

      form.append('chat_id', CHAT_ID);
      form.append('media', JSON.stringify(mediaArray));

      const telegramRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMediaGroup`, {
        method: 'POST',
        body: form
      });

      const result = await telegramRes.json();
      if (!result.ok) {
        throw new Error(result.description || 'Failed to send photos to Telegram');
      }

    } else {
      // Fallback if no images were attached
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: captionText,
          parse_mode: 'Markdown'
        })
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
