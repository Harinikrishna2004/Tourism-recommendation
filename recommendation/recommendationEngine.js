const Destination = require('../models/Destination');
const Preference = require('../models/Preference');
const User = require('../models/User');

/**
 * Simple content-based recommendation system
 * Matches user preferences with destination attributes
 */
async function generateRecommendations(userId) {
  try {
    // Get user with preferences
    const user = await User.findById(userId).populate('preferences');
    if (!user || !user.preferences) {
      return {
        success: false,
        message: 'User preferences not found',
        recommendations: []
      };
    }

    // Get all destinations
    const allDestinations = await Destination.find({});
    
    // Calculate recommendation scores
    const scoredDestinations = allDestinations.map(destination => {
      let score = 0;
      const pref = user.preferences;
      
      // Category match
      if (pref.categories && pref.categories.length > 0) {
        const categoryMatches = destination.category.filter(cat => 
          pref.categories.includes(cat)
        ).length;
        score += (categoryMatches / pref.categories.length) * 3; // Weight: 3
      }
      
      // Budget match
      if (pref.budget && destination.cost === pref.budget) {
        score += 2; // Weight: 2
      }
      
      // Season match
      if (pref.preferredSeasons && pref.preferredSeasons.length > 0) {
        const seasonMatches = destination.bestSeasons.filter(season => 
          pref.preferredSeasons.includes(season)
        ).length;
        score += (seasonMatches / pref.preferredSeasons.length) * 2; // Weight: 2
      }
      
      // Activity match
      if (pref.preferredActivities && pref.preferredActivities.length > 0 && 
          destination.activities && destination.activities.length > 0) {
        const activityMatches = destination.activities.filter(activity => 
          pref.preferredActivities.includes(activity)
        ).length;
        const denominator = Math.min(pref.preferredActivities.length, destination.activities.length);
        score += (activityMatches / denominator) * 2; // Weight: 2
      }
      
      // Rating bonus
      score += destination.averageRating * 0.5; // Weight: 0.5
      
      return {
        destination,
        score
      };
    });
    
    // Sort by score (descending)
    const recommendations = scoredDestinations
      .sort((a, b) => b.score - a.score)
      .slice(0, 10) // Top 10 recommendations
      .map(item => ({
        ...item.destination.toObject(),
        matchScore: Math.min(Math.round(item.score * 10), 100) // Score as percentage, max 100
      }));
    
    return {
      success: true,
      recommendations
    };
  } catch (error) {
    console.error('Recommendation engine error:', error);
    return {
      success: false,
      message: 'Error generating recommendations',
      recommendations: []
    };
  }
}

/**
 * Get personalized recommendations based on user preferences
 */
exports.getPersonalizedRecommendations = async (req, res) => {
  try {
    const userId = req.user._id;
    const result = await generateRecommendations(userId);
    
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Get similar destinations based on a specific destination
 */
exports.getSimilarDestinations = async (req, res) => {
  try {
    const { destinationId } = req.params;
    
    // Get the reference destination
    const referenceDestination = await Destination.findById(destinationId);
    if (!referenceDestination) {
      return res.status(404).json({
        success: false,
        message: 'Destination not found'
      });
    }
    
    // Get all other destinations
    const otherDestinations = await Destination.find({
      _id: { $ne: destinationId }
    });
    
    // Score similarity
    const similarDestinations = otherDestinations.map(destination => {
      let score = 0;
      
      // Category similarity
      const categoryMatches = destination.category.filter(cat => 
        referenceDestination.category.includes(cat)
      ).length;
      score += (categoryMatches / referenceDestination.category.length) * 3;
      
      // Cost similarity
      if (destination.cost === referenceDestination.cost) {
        score += 2;
      }
      
      // Season similarity
      const seasonMatches = destination.bestSeasons.filter(season => 
        referenceDestination.bestSeasons.includes(season)
      ).length;
      score += (seasonMatches / referenceDestination.bestSeasons.length) * 1.5;
      
      return {
        destination,
        similarityScore: score
      };
    });
    
    // Return top 5 similar destinations
    const result = similarDestinations
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 5)
      .map(item => ({
        ...item.destination.toObject(),
        similarityScore: Math.min(Math.round(item.similarityScore * 10), 100)
      }));
    
    return res.status(200).json({
      success: true,
      similarDestinations: result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};