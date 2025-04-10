const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { ensureAuthenticated } = require("../middleware/auth");

// ✅ GET Friends Page
// routes/friends.js
router.get("/", ensureAuthenticated, async (req, res) => {
  try {
    const currentUser = req.user; // Provided by Passport
    const { dest_id, dest_name } = req.query; // Get query params
    console.log("🔍 Current user:", currentUser.username);
    console.log("🔍 Query params from dashboard:", { dest_id, dest_name });

    if (!currentUser) {
      console.log("🔍 No authenticated user found");
      return res.redirect("/auth/login");
    }

    const friendsList = await User.find({ username: { $ne: currentUser.username } })
      .select("username")
      .sort({ username: 1 });

    res.render("friends", {
      currentUser: currentUser.username,
      friends: friendsList,
      destId: dest_id, // Pass to EJS
      destName: dest_name // Pass to EJS
    });
  } catch (error) {
    console.error("🔥 Error loading friends page:", error);
    res.render("friends", {
      currentUser: "Unknown",
      friends: [],
      destId: null,
      destName: null,
      error: "Error loading friends list. Please try again."
    });
  }
});

module.exports = router;