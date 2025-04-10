const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Destination = require('../models/Destination');
const { ensureAuthenticated } = require('../middleware/auth');

// GET /favorite - Display user's favorite destinations
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    if (!req.user) {
      console.log('No user in request, redirecting to login');
      return res.redirect('/login');
    }

    const username = req.user.username;
    console.log('Fetching favorites for username:', username);

    // Fetch user with favorites array
    const userRecord = await User.findOne({ username }).lean();
    if (!userRecord || !userRecord.favorites || !userRecord.favorites.length) {
      console.log('No favorites found for user:', username);
      return res.render('favorites', { favorites: [], currentUser: username });
    }

    // Get destination IDs from favorites array
    const favoriteIds = userRecord.favorites;
    console.log('Favorite destination IDs:', favoriteIds);

    // Fetch destination details
    const destinations = await Destination.find({ _id: { $in: favoriteIds } }).lean();

    // Map favorites with their details, flattening the structure
    const favoritesWithDetails = favoriteIds.map(favId => {
      const dest = destinations.find(d => d._id.toString() === favId.toString());
      if (dest) {
        const ratings = Array.isArray(dest.ratings) ? dest.ratings : [];
        const userRating = ratings.find(r => {
          if (!r || typeof r !== 'object' || !r.user) return false;
          return typeof r.user === 'string' ? r.user === username : r.user.toString() === username;
        });
        return {
          _id: dest._id, // Include _id for links/buttons
          name: dest.name,
          description: dest.description,
          location: dest.location,
          budget: dest.budget,
          category: dest.category,
          bestSeasons: dest.bestSeasons,
          image: dest.image,
          images: dest.images,
          averageRating: dest.averageRating,
          rating: userRating ? userRating.score : null,
          review: userRating ? userRating.review : null,
          reviewImage: userRating ? userRating.reviewImage : null
        };
      }
      return null; // Return null for missing destinations
    }).filter(fav => fav !== null); // Filter out null entries

    console.log('✅ Favorites with details:', favoritesWithDetails);
    res.render('favorites', {
      favorites: favoritesWithDetails,
      currentUser: username
    });
  } catch (err) {
    console.error('🔥 Error fetching favorites:', err.stack);
    res.render('favorites', {
      favorites: [],
      currentUser: req.user ? req.user.username : 'Unknown',
      error: 'Error loading favorites: ' + err.message
    });
  }
});

// POST /favorite/toggle - Toggle a destination in user's favorites
router.post('/toggle', ensureAuthenticated, async (req, res) => {
  try {
    const { place, favorite } = req.body; // place is destination ID, favorite is boolean
    const username = req.user.username;

    if (!place) {
      return res.status(400).json({ success: false, error: 'Destination ID is required' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const destinationExists = await Destination.findById(place);
    if (!destinationExists) {
      return res.status(404).json({ success: false, error: 'Destination not found' });
    }

    if (favorite) {
      // Add to favorites if not already present
      if (!user.favorites.includes(place)) {
        user.favorites.push(place);
      }
    } else {
      // Remove from favorites
      user.favorites = user.favorites.filter(id => id.toString() !== place.toString());
    }

    await user.save();
    res.json({ success: true, isFavorited: favorite });
  } catch (err) {
    console.error('Error toggling favorite:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;

module.exports = router;