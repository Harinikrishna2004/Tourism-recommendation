const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const User = require('../models/User');
const crypto = require("crypto");
const Preference = require('../models/Preference');
const Destination = require('../models/Destination');
const { ensureAuthenticated } = require('../middleware/auth');
const nodemailer = require("nodemailer");

// ✅ Nodemailer Setup
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL, // Your email
    pass: process.env.EMAIL_PASSWORD, // Your email password
  },
});

// ✅ Login Page
router.get('/login', (req, res) => {
  if (req.isAuthenticated()) {
    console.log("Redirecting to profile");
    return res.redirect('/profile');
  }
  try {
    res.render('login', { title: 'Login' });
  } catch (err) {
    console.error("Error rendering login page:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ✅ Register Page
router.get('/register', async (req, res) => {
  res.render('register');
  console.log("recieved body:",req.body);
});

// ✅ Register User
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    let existingUser = await User.findOne({ email });
    if (existingUser) {
      console.error("🔥 Registration Error: User already exists");
      return res.status(401).json({ success: false, error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    console.log(`✅ User registered successfully: ${username}`);

    res.status(201).json({ success: true, message: "User registered successfully!" });

  } catch (err) {
    console.error("🔥 Server Error:", err); // Log error in console only
    res.status(500).json({ success: false, error: "Server error. Try again." });
  }
});

// ✅ Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      console.log("🚨 Invalid login attempt for:", username);
      return res.status(401).json({ success: false, error: "Invalid credentials" }); // ✅ Return JSON
    }

    // ✅ Store user details in session
    req.session.user = {
      id: user._id,
      username: user.username,
      email: user.email
    };

    console.log('✅ User logged in:', req.session.user.username);

    // ✅ Return JSON response (no redirect here)
    return res.status(200).json({ success: true, message: "Login successful!" });
  } catch (err) {
    console.error("🔥 Error during login:", err);
    return res.status(500).json({ success: false, error: "Server error. Try again." });
  }
});
// ✅ Profile Page - Show Visited Destinations
router.get('/profile', ensureAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id).populate('preferences').lean();
    if (!user) {
      console.log("🚨 User not found in database:", req.session.user.username);
      return res.redirect('/login');
    }
    const visitedDestinations = await Destination.find({ visitors: user._id });
    res.render('profile', { user, visitedDestinations, title: 'Your Profile' });
  } catch (err) {
    console.error("🔥 Error fetching profile:", err);
    res.status(500).send("Server error");
  }
});
router.get("/forgot-password", (req, res) => {
  res.render("forgot-password", { title: "Forgot Password", error: null, message: null });
});

// ✅ Verify OTP - Render Page
router.get("/verify-otp", (req, res) => {
  if (!req.session.email) return res.redirect("/forgot-password");
  res.render("verify-otp", { title: "Verify OTP", email: req.session.email, error: null });
});

// ✅ Reset Password - Render Page
router.get("/reset-password", (req, res) => {
  if (!req.session.email || !req.session.isOtpVerified) return res.redirect("/forgot-password");
  res.render("reset-password", { title: "Reset Password", email: req.session.email, error: null });
});

// ✅ Forgot Password - Send OTP
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.render("forgot-password", {
        title: "Forgot Password",
        error: "User not found.",
        message: null
      });
    }

    // Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; // Expires in 10 minutes

    // Store OTP in DB
    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    // Store in session
    req.session.email = email;
    req.session.otpExpires = otpExpires;

    // Send OTP via email
    await transporter.sendMail({
      from: process.env.EMAIL,
      to: user.email,
      subject: "Password Reset OTP",
      text: `Your OTP is: ${otp}. It expires in 10 minutes.`
    });

    console.log(`📧 OTP Sent to ${user.email}`);

    req.session.save(() => res.redirect("/verify-otp"));

  } catch (err) {
    console.error("🔥 Error sending OTP:", err);
    res.render("forgot-password", { title: "Forgot Password", error: "Server error. Try again.", message: null });
  }
});

// ✅ Verify OTP
router.post("/verify-otp", async (req, res) => {
  try {
    const { otp } = req.body;
    const user = await User.findOne({ email: req.session.email });

    if (!user || !user.otp || !user.otpExpires || user.otp !== otp || Date.now() > user.otpExpires) {
      return res.render("verify-otp", {
        title: "Verify OTP",
        error: "Invalid or expired OTP. Request a new one.",
        message: null
      });
    }

    console.log(`✅ OTP Verified for ${user.email}`);

    // 🛠 Store email & verification flag in session
    req.session.isOtpVerified = true;
    req.session.save(() => res.redirect("/reset-password"));  // ✅ Ensure session is saved before redirecting

  } catch (err) {
    console.error("🔥 Error verifying OTP:", err);
    res.render("verify-otp", { title: "Verify OTP", error: "Server error. Try again.", message: null });
  }
});


// ✅ Reset Password
router.post("/reset-password", async (req, res) => {
  try {
    const { password } = req.body;

    if (!req.session.isOtpVerified || !req.session.email) {
      return res.redirect("/forgot-password");  // ✅ Redirect if session data is missing
    }

    const user = await User.findOne({ email: req.session.email });
    if (!user) {
      return res.render("reset-password", { title: "Reset Password", error: "User not found.", message: null });
    }

    // Hash new password
    user.password = await bcrypt.hash(password, 10);
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    console.log(`✅ Password Reset Successful for ${user.email}`);

    // 🔥 Destroy session after password reset
    req.session.destroy((err) => {
      if (err) {
        console.error("🔥 Error clearing session:", err);
        return res.render("reset-password", {
          title: "Reset Password",
          error: "Error clearing session. Try logging in.",
          message: null
        });
      }
      res.redirect("/login");
    });

  } catch (err) {
    console.error("🔥 Error resetting password:", err);
    res.render("reset-password", { title: "Reset Password", error: "Server error. Try again.", message: null });
  }
});




// ✅ Dashboard
router.get('/dashboard', ensureAuthenticated, async (req, res) => {
  
  try {
    const featuredDestinations = await Destination.find().limit(6);

    console.log(`✅ Dashboard loaded for user: ${req.session.user.username}`);

    res.render('dashboard', { 
      title: 'Dashboard', 
      user: req.session.user,
      featuredDestinations 
    });
  } catch (err) {
    console.error("🔥 Error loading dashboard:", err);
    res.status(500).send('Server error');
  }
});

// ✅ Logout
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
      if (err) {
          console.error("Error logging out:", err);
          return res.status(500).send("Failed to log out");
      }
      res.redirect("/"); // Redirect to the home page (index.ejs)
  });
});


module.exports = router;
