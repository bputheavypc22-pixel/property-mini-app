const express = require('express');
const path = require('path');

const app = express();

// ==========================================
// 1. MIDDLEWARE CONFIGURATION
// ==========================================
// Parse JSON and URL-encoded bodies sent by fetch / POST requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files (HTML, CSS, Client JS) from the 'public' directory
// Adjust 'public' if your HTML files are in a different folder (e.g., './')
app.use(express.static(path.join(__dirname, 'public')));


// ==========================================
// 2. HELPER FUNCTION: TELEGRAM BOT NOTIFIER
// ==========================================
async function sendTelegramMessage(text) {
  const botToken = process.env.BOT_TOKEN;
  const chatId = process.env.CHAT_ID;

  if (!botToken || !chatId) {
    console.warn('⚠️ BOT_TOKEN or CHAT_ID environment variable missing!');
    return;
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Telegram API Error: ${errorData.description || 'Failed to send message'}`);
  }
}


// ==========================================
// 3. API ENDPOINTS
// ==========================================

// --- Property Listing Endpoint ---
app.post('/api/property-listing', async (req, res) => {
  try {
    const data = req.body;

    const message = `
<b>🏠 NEW PROPERTY LISTING</b>
--------------------------------
<b>🏷 Title / Type:</b> ${data.title || data.propertyType || 'N/A'}
<b>📍 Location:</b> ${data.location || 'N/A'}
<b>💰 Price:</b> ${data.price || 'N/A'}
<b>📞 Contact:</b> ${data.contact || 'N/A'}
<b>📝 Details:</b> ${data.details || 'N/A'}
<b>👤 Submitted By:</b> ${data.submittedBy || 'N/A'}
    `.trim();

    await sendTelegramMessage(message);

    return res.status(200).json({ success: true, message: 'Property listing submitted successfully!' });
  } catch (error) {
    console.error('Error submitting property listing:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});


// --- Client Inquiry Endpoint ---
app.post('/api/client-inquiry', async (req, res) => {
  try {
    const data = req.body;

    const message = `
<b>🔍 NEW CLIENT INQUIRY</b>
--------------------------------
<b>👤 Name:</b> ${data.name || 'N/A'}
<b>📞 Phone 1:</b> ${data.tel1 || 'N/A'}
<b>📞 Phone 2:</b> ${data.tel2 || 'N/A'}
<b>💬 Telegram:</b> ${data.clientTelegram || 'N/A'}

<b>🎯 Looking For:</b> ${data.target || 'N/A'}
<b>🏠 Property Type:</b> ${data.propertyType || 'N/A'}
<b>💰 Budget:</b> ${data.budget || 'N/A'}
<b>📍 Preferred Location:</b> ${data.preferredLocation || 'N/A'}
<b>🏢 Building Size:</b> ${data.buildingSize || 'N/A'}
<b>📐 Land Size:</b> ${data.landSize || 'N/A'}
<b>🛏 Bedrooms:</b> ${data.bedrooms || 'N/A'}
<b>🚿 Bathrooms:</b> ${data.bathrooms || 'N/A'}
<b>🧭 Direction:</b> ${data.direction || 'N/A'}
<b>⚡ Urgency Level:</b> ${data.urgentLevel || 'N/A'}
<b>📝 Remark:</b> ${data.remark || 'N/A'}

<b>👤 Submitted By:</b> ${data.submittedBy || 'N/A'}
    `.trim();

    await sendTelegramMessage(message);

    return res.status(200).json({ success: true, message: 'Client inquiry submitted successfully!' });
  } catch (error) {
    console.error('Error submitting client inquiry:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});


// ==========================================
// 4. FALLBACK & ERROR HANDLING
// ==========================================

// Catch-all API 404 handler (Prevents returning HTML error pages when routes are missing)
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, error: 'API route not found.' });
});

// Serve frontend index.html for root path if needed
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// ==========================================
// 5. SERVER INITIALIZATION
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
