const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Destination = require('../models/Destination');
const { ensureAuthenticated } = require('../middleware/auth');
const mongoose = require('mongoose');

router.get('/favorites', ensureAuthenticated, async (req, res) => {
  console.log('Favorites route hit with query:', req.query);
  const { dest_id, dest_name } = req.query;

  if (!dest_id) {
    console.log('Missing dest_id in request');
    return res.redirect('/dashboard?error=No destination ID provided');
  }

  console.log('Processing favorite request:', { dest_id, dest_name });

  try {
    // Cast dest_id to ObjectId explicitly
    const destinationId = new mongoose.Types.ObjectId(dest_id);
    console.log('Checking if destination exists:', destinationId);
    const destination = await Destination.findById(destinationId);
    if (!destination) {
      console.log('Destination not found in database:', destinationId);
      return res.redirect('/dashboard?error=Destination not found');
    }
    console.log('Destination found:', { id: destination._id, name: destination.name });

    const username = req.user.username;
    console.log('Fetching user by username:', username);
    const user = await User.findOne({ username });
    if (!user) {
      console.log('User not found in database for username:', username);
      return res.redirect('/dashboard?error=User not found');
    }
    console.log('User found:', { id: user._id, username: user.username, currentFavorites: user.favorites });

    if (!user.favorites.includes(destinationId.toString())) {
      console.log('Adding destination to favorites:', destinationId);
      user.favorites.push(destinationId);
      await user.save();
      console.log('User updated successfully, new favorites:', user.favorites);
    } else {
      console.log('Destination already in favorites, no update needed:', destinationId);
    }

    console.log('Redirecting to dashboard with success message');
    res.redirect(`/dashboard?message=${encodeURIComponent(`${dest_name} added to favorites`)}`);
  } catch (error) {
    console.error('Error in favorites route:', error.stack);
    res.redirect('/dashboard?error=Server error');
  }
});

// DELETE route remains unchanged as it’s not part of the failing tests yet
router.delete('/api/favorites', ensureAuthenticated, async (req, res) => {
  console.log('DELETE /api/favorites hit with body:', req.body);
  const { destinationId } = req.body;

  if (!destinationId) {
    console.log('Missing destinationId in request');
    return res.status(400).json({ success: false, error: 'Destination ID is required' });
  }

  try {
    console.log('Checking if destination exists:', destinationId);
    const destination = await Destination.findById(destinationId);
    if (!destination) {
      console.log('Destination not found in database:', destinationId);
      return res.status(404).json({ success: false, error: 'Destination not found' });
    }
    console.log('Destination found:', { id: destination._id, name: destination.name });

    const username = req.user.username;
    console.log('Fetching user by username:', username);
    const user = await User.findOne({ username });
    if (!user) {
      console.log('User not found in database for username:', username);
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    console.log('User found:', { id: user._id, username: user.username, currentFavorites: user.favorites });

    const index = user.favorites.indexOf(destinationId);
    if (index === -1) {
      console.log('Destination not in favorites:', destinationId);
      return res.status(400).json({ success: false, error: 'Destination not in favorites' });
    }

    console.log('Removing destination from favorites:', destinationId);
    user.favorites.splice(index, 1);
    await user.save();
    console.log('User updated successfully, new favorites:', user.favorites);

    res.json({ success: true, message: 'Destination removed from favorites' });
  } catch (error) {
    console.error('Error removing favorite:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;