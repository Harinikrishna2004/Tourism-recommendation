const mongoose = require("mongoose");
const Preference = require("../models/Preference");
const User = require("../models/User"); // Ensure user exists before assigning preferences
const connectDB = require("../config/db");
require("dotenv").config();
const user = await User.findOne({ username });
const mailOptions = { ...mailOptions, to: user.email };
const seedPreferences = async () => {
  try {
    await connectDB();

    // Clear existing preferences
    await Preference.deleteMany({});
    console.log("✅ Existing preferences cleared");

    // Find a user to associate preferences (Replace with actual username)
    const user = await User.findOne({ username: "harinikrishna" });

    if (!user) {
      console.error("❌ User not found! Make sure a user exists before adding preferences.");
      mongoose.disconnect();
      return;
    }

    // Create a new preferences document
    const preference = new Preference({
      user: user.username, // Store username instead of ObjectId
      categories: ["beach", "mountain"],
      budget: "low",
      preferredSeasons: ["spring", "summer"],
      preferredActivities: ["hiking"],
      travelStyle: "relaxed",
      travelDuration: "weekend",
    });

    await preference.save();
    console.log("✅ Preferences added to the database");

    mongoose.disconnect();
  } catch (error) {
    console.error(`🔥 Error seeding preferences: ${error.message}`);
    process.exit(1);
  }
};

seedPreferences();
