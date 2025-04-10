  const mongoose = require('mongoose');
  const VisitedPlaces = require('../models/Visited');
  const connectDB = require('../config/db');
  require('dotenv').config();

  const visitedData = [
    {
      username: 'John Doe',
      visited: ['Paris', 'New York City', 'Dubai']
    },
    {
      username: 'harinikrishna',
      visited: ['Bali', 'Sydney', 'Rio de Janeiro']
    },
    {
      username: 'john_doe',
      visited: ['Kyoto', 'Venice', 'Machu Picchu']
    },
    {
      username: 'alice_wonder',
      visited: ['Santorini', 'Cairo', 'Rome']
    },
    {
      username: 'emily_white',
      visited: ['Bangkok', 'Prague', 'Istanbul']
    },
    {
      username: 'kartikeya',
      visited: ['Bangkok', 'Prague', 'Istanbul']
    }
  ];

  const seedVisitedData = async () => {
    try {
      await connectDB();

      // Clear existing visited places data
      await VisitedPlaces.deleteMany({});
      console.log('Existing visited places cleared');

      // Insert new visited places data
      await VisitedPlaces.insertMany(visitedData);
      console.log('Visited places data added to the database');

      mongoose.disconnect();
    } catch (error) {
      console.error(`Error seeding visited places: ${error.message}`);
      process.exit(1);
    }
  };

  seedVisitedData();
