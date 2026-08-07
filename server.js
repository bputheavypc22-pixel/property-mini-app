const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Environment Variables (Set these on Render)
const BOT_TOKEN = process.env.BOT_TOKEN;
const GROUP_CHAT_ID = process.env.GROUP_CHAT_ID;

// Webhook / Route to receive form submissions
app.post('/api/register', async (req, res) => {
  try {
    const {
      name,
      tel1,
      tel2,
      clientTelegram,
      target,
      propertyType,
      priceRank,
      area,
      buildingSize,
      landSize,
      bedrooms,
      bathrooms,
      direction,
      parking,
      remark,
      submittedBy
    } = req.body;

    // Get current date & time formatted
    const now = new Date();
    const formattedDate = now.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    // Construct the formatted Telegram message
    const message = 
`👥 ព័ត៌មានភ្ញៀវថ្មី / NEW CLIENT INQUIRY
━━━━━━━━━━━━━━━━━━━━━
👤 ព័ត៌មានភ្ញៀវ / Client Profile
📇 ឈ្មោះ / Name: ${name}
📞 Tel1: ${tel1}
📞 Tel2: ${tel2}
💬 Telegram: ${clientTelegram}
━━━━━━━━━━━━━━━━━━━━━
🎯 គោលបំណង / Target: ${target}
🏗️ ប្រភេទ / Type: ${propertyType}
💰 តម្លៃ / Price Rank: ${priceRank}
📍 តំបន់ / Area:
${area}
🧱 ទំហំអគារ / Building Size: ${buildingSize}
📐 ទំហំដី / Land Size: ${landSize}
🛏 បន្ទប់គេង / Bedrooms: ${bedrooms}
🛁 បន្ទប់ទឹក / Bathrooms: ${bathrooms}
🧭 ទិស / Direction: ${direction}
🅿️ ចំណត / Parking: ${parking}
✏️ សម្គាល់ / Remark: ${remark}
━━━━━━━━━━━━━━━━━━━━━
_Submitted by: ${submittedBy}_
_Date: ${formattedDate}_`;

    // Send payload to Telegram API (Parse Mode: HTML or Markdown)
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: GROUP_CHAT_ID,
      text: message,
      parse_mode: 'Markdown'
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error sending message:', error?.response?.data || error.message);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
