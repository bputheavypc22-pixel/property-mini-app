// Express route for Client Inquiry
app.post('/api/client-inquiry', async (req, res) => {
  try {
    const data = req.body;
    
    // Construct Telegram message text
    const message = `
<b>🔍 NEW CLIENT INQUIRY</b>
--------------------------------
<b>👤 Name:</b> ${data.name || 'N/A'}
<b>📞 Phone 1:</b> ${data.tel1}
<b>📞 Phone 2:</b> ${data.tel2 || 'N/A'}
<b>💬 Telegram:</b> ${data.clientTelegram || 'N/A'}

<b>🎯 Looking For:</b> ${data.target}
<b>🏠 Property Type:</b> ${data.propertyType}
<b>💰 Budget:</b> ${data.budget}
<b>📍 Preferred Location:</b> ${data.preferredLocation}
<b>🏢 Building Size:</b> ${data.buildingSize || 'N/A'}
<b>📐 Land Size:</b> ${data.landSize || 'N/A'}
<b>🛏 Bedrooms:</b> ${data.bedrooms}
<b>🚿 Bathrooms:</b> ${data.bathrooms}
<b>🧭 Direction:</b> ${data.direction}
<b>⚡ Urgency Level:</b> ${data.urgentLevel}
<b>📝 Remark:</b> ${data.remark || 'N/A'}

<b>👤 Submitted By:</b> ${data.submittedBy}
    `.trim();

    // Send notification to your Telegram Chat/Channel
    await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.CHAT_ID, // Your Telegram Group / Channel ID
        text: message,
        parse_mode: 'HTML'
      })
    });

    // CRITICAL: Always return JSON response
    return res.status(200).json({ success: true, message: 'Inquiry submitted successfully!' });

  } catch (error) {
    console.error('Error submitting inquiry:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});
