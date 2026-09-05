const express = require('express');
const { Telegraf } = require('telegraf');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;

const bot = new Telegraf(BOT_TOKEN);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Client Inquiry Endpoint
app.post('/api/client-inquiry', async (req, res) => {
  try {
    const data = req.body;
    console.log('New Client Inquiry Received:', data);
    res.json({ success: true });
  } catch (err) {
    console.error('Error handling inquiry:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Thank-You Message Endpoint (Triggered when user clicks Close)
app.post('/api/send-thank-you', async (req, res) => {
  const { telegramId } = req.body;

  if (!telegramId) {
    return res.status(400).json({ success: false, error: 'Missing telegramId' });
  }

  const thankYouMessage = 
`✅ ការបញ្ជូនបានជោគជ័យ / Submission Confirmed

សូមអរគុណ! ព័ត៌មានលោកអ្នកត្រូវបានបញ្ចូលទៅក្នុងប្រព័ន្ធ Twenty5Realty រួចរាល់ហើយ។ ក្រុមការងារយើងនឹងពិនិត្យមើលក្នុងពេលឆាប់ៗនេះ។

Thank you! Your data has been successfully received by Twenty5Realty.`;

  try {
    await bot.telegram.sendMessage(telegramId, thankYouMessage);
    res.json({ success: true });
  } catch (err) {
    console.error('Error sending private thank-you message:', err);
    res.json({ success: false, error: err.message });
  }
});

bot.launch().then(() => {
  console.log('Telegram Bot running...');
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
