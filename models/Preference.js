const mongoose = require("mongoose");

const PreferenceSchema = new mongoose.Schema({
  user: {
    type: String,
    ref: "User", // Reference to User collection
    required: true
  },
  categories: {
    type: [String],
    enum: ['beach', 'mountain', 'city', 'countryside', 'historical', 'cultural']
  },
  budget: {
    type: String,
    enum: ['low', 'moderate', 'luxury'],
    default: 'low'
  },
  preferredSeasons: {
    type: [String],
    enum: ['spring', 'summer', 'fall', 'winter']
  },
  preferredActivities: {
    type: [String],
    enum: [
      'hiking',
      'sightseeing',
      'adventure_sports',
      'cultural_tours',
      'wildlife_safari',
      'beach_relaxation',
      'skiing',
      'camping',
      'boating',
      'food_tasting'
    ]
  },
  SpecialFares: {
    type: [String],
    enum: [
      'regular',
      'student_discount',
      'seniors_citizen',
      'armed_forces',
      'doctors_and_nurses',
    ]
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Preference", PreferenceSchema);