const express = require('express');
const router = express.Router();
const Destination = require('../models/Destination');
const { ensureAuthenticated } = require('../middleware/auth');
const upload = require('../config/upload'); // Import the Multer config

router.post('/submit-review', ensureAuthenticated, upload.single('reviewImage'), async (req, res) => {
  console.log('Reached /submit-review route');
  const { place, rating, review } = req.body;
  const username = req.user?.username;
  const reviewImage = req.file ? `/uploads/reviews/${req.file.filename}` : undefined; // Get the image path if uploaded

  console.log('Received review submission:', { place, rating, review, username, reviewImage });
  console.log('User object:', req.user);
  try {
    if (!place) {
      return res.status(400).json({ message: 'Place ID is required' });
    }
    if (!Number.isInteger(Number(rating)) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be an integer between 1 and 5' });
    }
    if (!username) {
      return res.status(401).json({ message: 'Username not found; authentication issue' });
    }

    const destination = await Destination.findById(place);
    if (!destination) {
      return res.status(404).json({ message: 'Destination not found' });
    }

    if (!Array.isArray(destination.ratings)) {
      destination.ratings = [];
    }

    console.log('Ratings before filtering:', destination.ratings);
    destination.ratings = destination.ratings.filter(r => r && r.user); // Remove entries without user
    console.log('Ratings after filtering:', destination.ratings);

    const existingRatingIndex = destination.ratings.findIndex(
      r => r && r.user && (typeof r.user === 'string' ? r.user === username : r.user.toString() === username)
    );

    if (existingRatingIndex !== -1) {
      // Update existing rating
      destination.ratings[existingRatingIndex].score = Number(rating);
  if (review) destination.ratings[existingRatingIndex].review = review;
  if (reviewImage) destination.ratings[existingRatingIndex].reviewImage = reviewImage;
  destination.ratings[existingRatingIndex].date = Date.now();
  console.log('Updated rating before save:', destination.ratings[existingRatingIndex]);
    } else {
      // Add new rating
      const newRating = {
        user: username,
        score: Number(rating),
        review: review || '',
        reviewImage: reviewImage,
        date: Date.now()
      };
      destination.ratings.push(newRating);
      console.log('New rating pushed before save:', newRating);
    }
    destination.markModified('ratings');
    console.log('Ratings before save:', destination.ratings);
    await destination.save();
    console.log('Saved destination ratings:', destination.ratings);
    res.status(200).json({ message: 'Review submitted successfully' });
  } catch (error) {
    console.error('Error submitting review:', error.stack);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

module.exports = router;