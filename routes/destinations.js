const express = require("express");
const router = express.Router();
const Destination = require("../models/Destination"); // MongoDB Model

router.get("/dashboard", async (req, res) => {
  try {
      const destinations = await Destination.find(); // Fetch destinations
      res.render("dashboard", {
          user: req.user,  
          filteredDestinations: destinations || []  // ✅ Ensure it's always an array
      });
  } catch (error) {
      console.error("Error fetching destinations:", error);
      res.render("dashboard", {
          user: req.user,
          filteredDestinations: []  // ✅ Send an empty array in case of error
      });
  }
});

// Get all destinations
router.get("/", async (req, res) => {
    try {
        const destinations = await Destination.find();
        res.json(destinations);
    } catch (error) {
        console.error("Error fetching destinations:", error);
        res.status(500).json({ error: "Failed to fetch destinations" });
    }
});
router.get('/nearby', async (req, res) => {
    try {
      const { lat, lng, maxDistance } = req.query;
  
      if (!lat || !lng) {
        console.log('Missing lat or lng');
        return res.status(400).json({ message: 'Latitude and longitude are required' });
      }
  
      const coordinates = [parseFloat(lng), parseFloat(lat)];
      const distance = maxDistance ? parseInt(maxDistance) : 10000;
  
      console.log('Query coordinates:', coordinates);
      console.log('Max distance:', distance);
  
      const nearbyDestinations = await Destination.find({
        'location.coordinates': {
          $near: {
            $geometry: { type: 'Point', coordinates },
            $maxDistance: distance,
          },
        },
      }).limit(10);
  
      console.log('Found destinations:', nearbyDestinations.length);
  
      const response = {
        message: 'Nearby destinations fetched successfully',
        data: nearbyDestinations,
      };
  
      console.log('Sending response:', JSON.stringify(response, null, 2));
      res.status(200).json(response);
      console.log('Response sent successfully'); // Confirm send completion
    } catch (error) {
      console.error('Error fetching nearby destinations:', error.message);
      res.status(500).json({ message: 'Failed to fetch nearby destinations', error: error.message });
    }
  });
// Get a single destination by ID
router.get("/:id", async (req, res) => {
    try {
        const destination = await Destination.findById(req.params.id);
        if (!destination) {
            return res.status(404).json({ error: "Destination not found" });
        }
        
        req.xhr ? res.json(destination) : res.render('destination-detail', { destination, user: req.user, title: destination.name });
    } catch (error) {
        console.error("Error fetching destination:", error);
        res.status(500).json({ error: "Failed to fetch destination" });
    }
});

// Get featured destinations (for homepage display)
router.get("/featured", async (req, res) => {
    try {
        const featuredDestinations = await Destination.find().limit(6); // Adjust limit as needed
        res.json(featuredDestinations);
    } catch (error) {
        console.error("Error fetching featured destinations:", error);
        res.status(500).json({ error: "Failed to fetch featured destinations" });
    }
});

// Filter destinations based on user criteria
router.post("/filter", async (req, res) => {
  try {
      const { searchQuery, category, budget, season, activity } = req.body;

      let filterCriteria = {};

      if (searchQuery) {
          filterCriteria.name = { $regex: searchQuery, $options: "i" };
      }
      if (category && category !== "any") {
          filterCriteria.category = category;
      }
      if (budget && budget !== "any") {
          filterCriteria.budget = budget;
      }
      if (season && season !== "any") {
          filterCriteria.bestSeasons = season;
      }
      if (activity && activity !== "any") {
          filterCriteria.preferredActivities = activity;
      }

      const filteredDestinations = await Destination.find(filterCriteria);

      res.json({
          success: true,
          destinations: filteredDestinations
      });

  } catch (error) {
      console.error("Error filtering destinations:", error);
      res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// Create a new destination
router.post("/", async (req, res) => {
    try {
        const newDestination = new Destination(req.body);
        await newDestination.save();
        res.status(201).json(newDestination);
    } catch (error) {
        console.error("Error adding destination:", error);
        res.status(500).json({ error: "Failed to add destination" });
    }
});

// Update a destination by ID
router.put("/:id", async (req, res) => {
    try {
        const updatedDestination = await Destination.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedDestination) {
            return res.status(404).json({ error: "Destination not found" });
        }
        res.json(updatedDestination);
    } catch (error) {
        console.error("Error updating destination:", error);
        res.status(500).json({ error: "Failed to update destination" });
    }
});

// Delete a destination by ID
router.delete("/:id", async (req, res) => {
    try {
        const deletedDestination = await Destination.findByIdAndDelete(req.params.id);
        if (!deletedDestination) {
            return res.status(404).json({ error: "Destination not found" });
        }
        res.json({ message: "Destination deleted successfully" });
    } catch (error) {
        console.error("Error deleting destination:", error);
        res.status(500).json({ error: "Failed to delete destination" });
    }
});



module.exports = router;