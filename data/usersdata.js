const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Import bcrypt
const User = require('../models/User');
const connectDB = require('../config/db');
require('dotenv').config();

const seedUsers = async () => {
  try {
    await connectDB();
    
    // Clear existing users
    await User.deleteMany({});
    console.log('Existing users cleared');

    // Sample users with hashed passwords
    const users = await Promise.all([
      {
        username: "harinikrishna",
        email: "thrilochani.devi@gmail.com",
        password: await bcrypt.hash("harini", 10), // Hash password
        createdAt: "2025-02-20T12:00:00Z"
      },
      {
        username: "john_doe",
        email: "john@example.com",
        password: await bcrypt.hash("john", 10),
        createdAt: "2025-02-18T15:30:00Z"
      },
      {
        username: "alice_wonder",
        email: "alice@example.com",
        password: await bcrypt.hash("alice", 10),
        createdAt: "2025-02-17T08:45:00Z"
      },
      {
        username: "emily_white",
        email: "emily@example.com",
        password: await bcrypt.hash("emily", 10), // Hash password
        createdAt: "2025-02-20T12:00:00Z"
      }
    ]);

    // Insert new users
    await User.insertMany(users);
    console.log('Sample users added to database');

    mongoose.disconnect();
  } catch (error) {
    console.error(`Error seeding users: ${error.message}`);
    process.exit(1);
  }
};

seedUsers();
