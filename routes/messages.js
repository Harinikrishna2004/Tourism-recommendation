// routes/messages.js
const express = require('express');
const router = express.Router();
const Message = require('../models/message'); // Adjust if model file is messages.js
const { ensureAuthenticated } = require('../middleware/auth');

router.get('/', ensureAuthenticated, async (req, res) => {
  console.log("Step 1: Called /messages");
  try {
    console.log("Step 2: Entering try block");
    const currentUser = req.user.username;
    console.log("Step 3: Current user:", currentUser);

    console.log("Step 4: Testing Message model import");
    console.log("Message model:", Message ? "Loaded" : "Not loaded");

    console.log("Step 5: Testing database connection");
    const messageCount = await Message.countDocuments();
    console.log("Step 6: Total messages in DB:", messageCount);

    console.log("Step 7: Fetching sent messages");
    const sentMessages = await Message.find({ senderName: currentUser })
      .populate({
        path: 'destinationId',
        model: 'Destination'
      })
      .lean();
    console.log("Step 8: Raw Sent Messages:", JSON.stringify(sentMessages, null, 2));

    console.log("Step 9: Fetching received messages");
    const receivedMessages = await Message.find({ receiverName: currentUser })
      .populate({
        path: 'destinationId',
        model: 'Destination'
      })
      .lean();
    console.log("Step 10: Raw Received Messages:", JSON.stringify(receivedMessages, null, 2));

    // Filter out messages with null/undefined destinationId
    const validSentMessages = sentMessages.filter(msg => msg.destinationId !== null && msg.destinationId !== undefined);
    const validReceivedMessages = receivedMessages.filter(msg => msg.destinationId !== null && msg.destinationId !== undefined);

    console.log("Step 11: Valid Sent Messages:", JSON.stringify(validSentMessages, null, 2));
    console.log("Step 12: Valid Received Messages:", JSON.stringify(validReceivedMessages, null, 2));

    console.log("Step 13: Rendering messages page");
    res.render('messages', {
      title: 'Messages',
      currentUser,
      sentMessages: validSentMessages,
      receivedMessages: validReceivedMessages,
      error: null // Explicitly set error to null when no error occurs
    });
  } catch (error) {
    console.error("Step 14: Error caught -", error.stack);
    res.render('messages', {
      title: 'Messages - Error',
      currentUser: req.user ? req.user.username : 'Unknown',
      sentMessages: [],
      receivedMessages: [],
      error: null // Set error message on failure
    });
  }
});

module.exports = router;