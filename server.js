// Function to handle property form submissions
const handlePropertySubmission = async (req, res) => {
  try {
    const data = req.body;

    const message = `
<b>🏰 NEW PROPERTY LISTING</b>
--------------------------------
<b>🏷 Title / Type:</b> ${data.title || data.propertyType || data.type || 'N/A'}
<b>📍 Location:</b> ${data.location || data.preferredLocation || 'N/A'}
<b>💰 Price:</b> ${data.price || 'N/A'}
<b>📞 Contact:</b> ${data.contact || data.tel1 || 'N/A'}
<b>📝 Details:</b> ${data.details || data.remark || 'N/A'}
<b>👤 Submitted By:</b> ${data.submittedBy || 'N/A'}
    `.trim();

    await sendTelegramMessage(message, propertyTopicId);

    return res.status(200).json({ success: true, message: 'Property listing submitted successfully!' });
  } catch (error) {
    console.error('Error submitting property listing:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Catch all common path variations for property submissions
app.post('/api/property-listing', handlePropertySubmission);
app.post('/api/property', handlePropertySubmission);
app.post('/api/properties', handlePropertySubmission);
app.post('/api/submit-property', handlePropertySubmission);
app.post('/api/add-property', handlePropertySubmission);
