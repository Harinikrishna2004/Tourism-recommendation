const mongoose = require('mongoose');

const DestinationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Destination name is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  location: {
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true
    },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        required: [true, 'Coordinates are required'],
        default: [0, 0], // Default longitude, latitude
        validate: {
          validator: function (v) {
            return Array.isArray(v) && v.length === 2 &&
                   typeof v[0] === 'number' && typeof v[1] === 'number' &&
                   v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90;
          },
          message: 'Coordinates must be [longitude, latitude] within valid ranges'
        }
      }
    }
  },
  isIndian: {
    type: Boolean,
    required: true
  },
  images: {
    type: [String],
    default: []
  },
  image: {
    type: String,
    required: [true, 'Main image is required']
  },
  category: {
    type: [String],
    enum: ['beach', 'mountain', 'city', 'countryside', 'historical', 'cultural', 'adventure'],
    required: [true, 'At least one category is required']
  },
  preferredActivities: {
    type: [String],
    enum: [
      'hiking', 'sightseeing', 'adventure_sports', 'cultural_tours',
      'wildlife_safari', 'beach_relaxation', 'skiing', 'camping',
      'boating', 'food_tasting'
    ],
    default: []
  },
  budget: {
    type: String,
    enum: ['high', 'moderate', 'low'],
    required: [true, 'Budget level is required']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  bestSeasons: {
    type: [String],
    enum: ['spring', 'summer', 'fall', 'winter', 'monsoon'],
    required: [true, 'At least one best season is required']
  },
  activities: {
    type: [String],
    default: []
  },
  ratings: [{
    user: {
      type: String,
      required: true
    },
    score: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating must not exceed 5']
    },
    review: {
      type: String,
      trim: true
    },
    reviewImage: {  // New field for image URL
      type: String,
      trim: true
    },
    date: {
      type: Date,
      default: Date.now
    }
  }],
  averageRating: {
    type: Number,
    default: 0,
    min: [0, 'Average rating cannot be negative'],
    max: [5, 'Average rating cannot exceed 5']
  }
});

// Add 2dsphere index for geospatial queries
DestinationSchema.index({ 'location.coordinates': '2dsphere' });

// Calculate average rating before saving
DestinationSchema.pre('save', function (next) {
  if (this.ratings && this.ratings.length > 0) {
    const totalScore = this.ratings.reduce((sum, rating) => sum + rating.score, 0);
    this.averageRating = Math.round((totalScore / this.ratings.length) * 10) / 10;
  } else {
    this.averageRating = 0;
  }
  next();
});

module.exports = mongoose.model('Destination', DestinationSchema);
