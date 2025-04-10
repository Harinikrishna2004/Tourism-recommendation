const mongoose = require('mongoose');
const User = require('./User'); // Import the User model

const visitedPlacesSchema = new mongoose.Schema({
    username: { type: String, required: true }, // Store username instead of userId
    visited: [{ 
         type: String, required: true // Store place name
    }]
});

// Export the model, reusing it if already defined
module.exports = mongoose.models.VisitedPlaces || mongoose.model('VisitedPlaces', visitedPlacesSchema);