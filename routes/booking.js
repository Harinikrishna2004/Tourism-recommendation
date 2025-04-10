
const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const Destination = require("../models/Destination");
const { ensureAuthenticated } = require("../middleware/auth");

// GET booking page
router.get("/booking", ensureAuthenticated, async (req, res) => {
  try {
    const destinationName = req.query.destination_name;
    if (!destinationName) {
      return res.status(400).send("No destination specified");
    }
    const destination = await Destination.findOne({ name: destinationName });
    if (!destination) {
      return res.status(404).send("Destination not found");
    }
    res.render("booking", { destination });
  } catch (error) {
    console.error("Error fetching destination:", error);
    res.status(500).send("Server error");
  }
});

// POST booking submission
router.post("/submit-booking", ensureAuthenticated, async (req, res) => {
  console.log("POST /booking/submit-booking called with body:", req.body);

  try {
    // Ensure user is logged in and get their username from the session or token
    if (!req.user || !req.user.username) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    const username = req.user.username; // Get username from logged-in user
    const { destination_name, visit_date, amount_paid, hotel_price, flight_price } = req.body;

    if (!destination_name || !visit_date || !amount_paid) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const destination = await Destination.findOne({ name: destination_name });
    if (!destination) {
      return res.status(400).json({ success: false, message: "Destination not found" });
    }

    const baseAmountInINR = destination.amount ? Math.round(destination.amount * 83) : 0;
    const hotelPriceInINR = parseFloat(hotel_price) || 0;
    const flightPriceInINR = parseFloat(flight_price) || 0;
    const expectedTotal = hotelPriceInINR + flightPriceInINR;

    console.log('Received:', { destination_name, visit_date, amount_paid, hotel_price, flight_price });
    console.log('Calculated:', { expectedTotal, hotelPriceInINR, flightPriceInINR });

    if (parseFloat(amount_paid) !== expectedTotal) {
      return res.status(400).json({ success: false, message: `Incorrect total amount. Expected: ${expectedTotal}, Received: ${amount_paid}` });
    }

    // Create booking with username instead of user_id
    const booking = new Booking({
      username,  // Directly using the authenticated user's username
      destination_id: destination._id,
      visit_date,
      amount_paid: expectedTotal,
      hotel_price: hotelPriceInINR,
      flight_price: flightPriceInINR,
      payment_status: "Pending",
    });

    await booking.save();

    res.status(201).json({ 
      success: true, 
      message: "Booking confirmed!",
      redirect: `/payment?booking_id=${booking._id}`
    });

  } catch (error) {
    console.error("Error processing booking:", error);
    res.status(500).json({ success: false, message: `Error processing booking: ${error.message}` });
  }
});




module.exports = router;
