const express = require("express");
const bcrypt = require("bcryptjs");
const cors = require("cors"); // ✅ Import CORS
const User = require("../models/User"); 
const router = express.Router();



// ✅ CORS Middleware (Uncomment if frontend & backend are on different origins)
router.use(cors({ credentials: true, origin: "http://localhost:3000" }));

// ✅ GET: Render Edit Account Page
router.get("/edit-account", async (req, res) => {
  if (!req.session.user) {
    console.error("❌ No user in session, redirecting to login.");
    return res.redirect("/login");
  }

  try {
    const user = await User.findById(req.session.user.id);
    if (!user) {
      console.error("❌ User not found in DB, redirecting to login.");
      return res.redirect("/login");
    }

    console.log("✅ User data retrieved for edit page:", user);
    res.render("edit-account", { user, error: null, success: null });
  } catch (err) {
    console.error("🔥 Error fetching user for edit:", err);
    res.redirect("/login");
  }
});

// ✅ POST: Update User Details
router.post("/edit/update-account", async (req, res) => {
  if (!req.session.user) {
      console.error("❌ No user in session, redirecting to login.");
      return res.status(401).json({ error: "Unauthorized request" }); // ✅ Return JSON
  }

  try {
      const { email, username, password } = req.body;
      const user = await User.findById(req.session.user.id);

      if (!user) {
          console.error("❌ User not found in DB.");
          return res.status(404).json({ error: "User not found" }); // ✅ Return JSON
      }

      // Check if email or username already exists (excluding current user)
      const existingEmail = await User.findOne({ email });
      if (existingEmail && existingEmail.id !== user.id) {
          return res.status(400).json({ error: "Email already in use." }); // ✅ Return JSON
      }

      const existingUsername = await User.findOne({ username });
      if (existingUsername && existingUsername.id !== user.id) {
          return res.status(400).json({ error: "Username already taken." }); // ✅ Return JSON
      }

      // ✅ Update user details
      user.email = email;
      user.username = username;

      // ✅ Hash and update password if provided
      if (password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(password, salt);
      }

      await user.save();

      // ✅ Update session data
      req.session.user.email = user.email;
      req.session.user.username = user.username;

      console.log("✅ User account updated:", user);
      return res.status(200).json({ success: true, message: "Account updated successfully!" }); // ✅ Correct Response
  } catch (err) {
      console.error("🔥 Error updating account:", err);
      return res.status(500).json({ error: "Server error. Try again." }); // ✅ Return JSON
  }
});


// ✅ GET: Fetch User Data for Frontend
router.get("/edit/get-user", async (req, res) => {
  console.log("📌 Session data:", req.session); // Debugging session data

  if (!req.session.user) {
    console.error("❌ No user found in session.");
    return res.status(401).json({ error: "Unauthorized request." });
  }

  try {
    // ✅ Return user data directly from session
    const userData = { username: req.session.user.username, email: req.session.user.email };

    console.log("✅ Returning user data:", userData);
    res.json(userData);
  } catch (err) {
    console.error("🔥 Error fetching user:", err);
    res.status(500).json({ error: "Failed to fetch user data" });
  }
});

router.delete("/delete-account", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: "Unauthorized request" });
    }

    const user = await User.findById(req.session.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Delete user from database
    await User.deleteOne({ _id: user.id });

    // Destroy session after deletion
    req.session.destroy((err) => {
      if (err) {
        console.error("🔥 Error destroying session:", err);
        return res.status(500).json({ error: "Failed to delete account" });
      }

      // ✅ Redirect only once after session is destroyed
      res.clearCookie("connect.sid"); // Clear session cookie
      return res.status(200).json({ redirectUrl: "/" }); // Send JSON response with redirect URL
    });

  } catch (err) {
    console.error("🔥 Error deleting account:", err);
    res.status(500).json({ error: "Server error. Try again." });
  }
});


  
  
// ✅ Export the router properly
module.exports = router;
