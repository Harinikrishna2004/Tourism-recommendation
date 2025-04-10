const express = require('express');
const router = express.Router();
const VisitedPlaces = require('../models/Visited');
const Destination = require('../models/Destination');
const { ensureAuthenticated } = require('../middleware/auth');

// Export the handler for testing
const getVisitedPlaces = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect('/login');
    }

    const username = req.user.username;
    console.log('Fetching visited places for username:', username);

    const userRecord = await VisitedPlaces.findOne({ username }).lean();
    if (!userRecord || !userRecord.visited.length) {
      return res.render('visited', { visitedPlaces: [], currentUser: username });
    }

    const placeNames = userRecord.visited;
    const destinations = await Destination.find({ name: { $in: placeNames } }).lean();

    const visitedWithDetails = placeNames.map(place => {
      const dest = destinations.find(d => d.name === place);
      if (dest) {
        const ratings = Array.isArray(dest.ratings) ? dest.ratings : [];
        const userRating = ratings.find(r => {
          if (!r || typeof r !== 'object' || !r.user) return false;
          return typeof r.user === 'string' ? r.user === username : r.user.toString() === username;
        });
        return {
          place,
          destination: dest,
          rating: userRating ? userRating.score : null,
          review: userRating ? userRating.review : null,
          reviewImage: userRating ? userRating.reviewImage : null
        };
      }
      return { place, destination: null };
    });

    console.log('✅ Visited places with details:', visitedWithDetails);
    res.render('visited', {
      visitedPlaces: visitedWithDetails,
      currentUser: username
    });
  } catch (err) {
    console.error('🔥 Error fetching visited places:', err.stack);
    res.render('visited', {
      visitedPlaces: [],
      currentUser: req.user ? req.user.username : 'Unknown',
      error: 'Error loading visited places: ' + err.message
    });
  }
};

router.get('/', ensureAuthenticated, getVisitedPlaces);

module.exports = router;
module.exports.getVisitedPlaces = getVisitedPlaces; // Export for testing