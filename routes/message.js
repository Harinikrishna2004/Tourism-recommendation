const express = require('express');
const router = express.Router();
const Message = require('../models/message');
router.post('/share-destination', async (req, res) => {
  try {
    const { destinationId, senderName, receiverName } = req.body;
    console.log('Received in API:', { destinationId, senderName, receiverName });

    if (!destinationId || !senderName || !receiverName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const message = new Message({
      senderName,
      receiverName,
      destinationId
    });
    await message.save();
    console.log('Message saved successfully:', message);
    res.json({ success: true });
  } catch (error) {
    console.error('Error in share-destination:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});
module.exports = router;