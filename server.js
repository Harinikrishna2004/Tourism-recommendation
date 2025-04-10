require("dotenv").config();
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("passport");
const path = require("path");
const flash = require("express-flash");
const cors = require("cors");
const axios = require("axios");

// Import Database and Models
const connectDB = require("./config/db");
const Destination = require("./models/Destination");
const Booking = require("./models/Booking");
const Event = require("./models/Event");

// Import Routes
const visitedRoutes = require("./routes/visited");
const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboard");
const paymentRoutes = require("./routes/payment");
const bookingRoutes = require("./routes/booking");
const editRoutes = require("./routes/Edit");
const destinationRoutes = require("./routes/destinations");
const favoritesRoutes = require("./routes/favorites");
const friendRoutes = require("./routes/friends");
const MessageRoutes = require("./routes/message");
const messagesRoutes = require('./routes/messages');
const Ratings = require("./routes/rating");
const favoriteRoutes = require("./routes/favorite");
const reservationRoutes = require("./routes/reservations");

// Initialize Express App
const app = express();

// Connect to MongoDB
connectDB();

// Middleware: Parse JSON and URL-encoded data
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use(express.urlencoded({ extended: true }));
app.use(cors({ credentials: true, origin: "http://localhost:3000" }));

// Set EJS as the view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Session Configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "tourism-secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI || "mongodb://localhost:27017/tourism-recommendation",
      collectionName: "sessions",
    }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 }, // 1 Day Session Expiry
  })
);

// Debugging Passport and Session
app.get("/session-check", (req, res) => {
  console.log("📌 Session Data:", req.session);
  console.log("📌 Passport User:", req.user);
  res.json({
    session: req.session,
    passportUser: req.user,
    loggedIn: !!req.user,
  });
});

// Passport Middleware (AFTER session setup)
app.use(passport.initialize());
app.use(passport.session());
require("./config/passport")(passport);

// Flash Messages Middleware
app.use(flash());

// Middleware to make `user` available in all EJS templates
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

// HotelAPI.co Free API Route with Mock Data Fallback
app.post("/api/hotels-free", async (req, res) => {
  const { city } = req.body;
  console.log("📡 [HOTELAPI FREE] Request Received:", { city });

  if (!city) {
    return res.status(400).json({ success: false, error: "Missing required field: city" });
  }

  try {
    const url = `https://api.makcorps.com/free/${encodeURIComponent(city)}`;
    const headers = { 'Authorization': `JWT 67bffb3104b32e7e603df6ed` };
    console.log(`🌐 [HOTELAPI FREE] Trying URL: ${url}`);
    const response = await axios.get(url, { headers });
    console.log("✅ [HOTELAPI FREE] Success with API!");
    return res.json({ success: true, data: response.data });
  } catch (error) {
    console.log(`⚠ [HOTELAPI FREE] API request failed, using mock data instead`);
    const mockHotels = generateMockHotels(city);
    return res.json({ success: true, data: mockHotels, source: "mock" });
  }
});

// Fetch user's bookings and events for the calendar
app.get("/api/calendar/data", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  try {
    const bookings = await Booking.find({ user_id: req.user._id }).populate("destination_id");
    const events = await Event.find({ user_id: req.user._id });
    const calendarData = {
      bookings: bookings.map((booking) => ({
        id: booking._id,
        type: "booking",
        title: `Trip to ${booking.destination_id.name}`,
        date: booking.visit_date,
        details: booking.details,
      })),
      events: events.map((event) => ({
        id: event._id,
        type: "event",
        title: event.title,
        date: event.date,
        description: event.description,
      })),
    };
    res.json({ success: true, data: calendarData });
  } catch (error) {
    console.error("Error fetching calendar data:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// Add a new event
app.post("/api/calendar/event", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  const { title, date, description } = req.body;
  if (!title || !date) {
    return res.status(400).json({ success: false, message: "Title and date are required" });
  }
  try {
    const event = new Event({ user_id: req.user._id, title, date, description });
    await event.save();
    res.json({ success: true, message: "Event added successfully", event });
  } catch (error) {
    console.error("Error adding event:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// FlightAPI.co Free API Route with Mock Data Fallback
app.post("/api/flights-free", async (req, res) => {
  const { origin, destination, date } = req.body;
  console.log("📡 [FLIGHTAPI FREE] Request Received:", { origin, destination, date });

  if (!origin || !destination) {
    return res.status(400).json({ success: false, error: "Missing required fields: origin and destination are required" });
  }

  try {
    const url = `https://api.makcorps.com/flights/free?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`;
    const headers = { 'Authorization': `JWT 67bffb3104b32e7e603df6ed` };
    console.log(`🌐 [FLIGHTAPI FREE] Trying URL: ${url}`);
    const response = await axios.get(url, { headers });
    console.log("✅ [FLIGHTAPI FREE] Success with API!");
    return res.json({ success: true, data: response.data });
  } catch (error) {
    console.log(`⚠ [FLIGHTAPI FREE] API request failed, using mock data instead`);
    const mockFlights = generateMockFlights(origin, destination, date);
    return res.json({ success: true, data: mockFlights, source: "mock" });
  }
});

// Mock Data Functions
function generateMockFlights(origin, destination, date) {
  const airlines = ["SkyWings", "Global Air", "Oceanic Airlines", "Continental Express", "Blue Sky", "Pacific Flights"];
  const vendors = ["Expedia", "Kayak", "Skyscanner", "Orbitz"];
  let baseDuration = 120;
  const originFirstChar = origin.charAt(0).toUpperCase();
  const destFirstChar = destination.charAt(0).toUpperCase();
  const charDiff = Math.abs(originFirstChar.charCodeAt(0) - destFirstChar.charCodeAt(0));
  baseDuration += charDiff * 25;
  const isDomestic = origin.slice(-2) === destination.slice(-2);
  if (!isDomestic) baseDuration += 180;
  const flightCount = Math.floor(Math.random() * 6) + 3;
  const flights = [];
  let flightDate = date || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  for (let i = 0; i < flightCount; i++) {
    const airline = airlines[Math.floor(Math.random() * airlines.length)];
    const flightNumber = `${airline.substring(0, 2).toUpperCase()}${Math.floor(100 + Math.random() * 900)}`;
    const departureHour = Math.floor(6 + Math.random() * 16);
    const departureMin = Math.floor(Math.random() * 60);
    const departureTime = `${departureHour.toString().padStart(2, '0')}:${departureMin.toString().padStart(2, '0')}`;
    const durationVariation = Math.floor(Math.random() * 60) - 30;
    const duration = Math.max(60, baseDuration + durationVariation);
    const durationHours = Math.floor(duration / 60);
    const durationMins = duration % 60;
    const departDate = new Date(`${flightDate}T${departureTime}:00`);
    const arrivalDate = new Date(departDate.getTime() + duration * 60000);
    const arrivalTime = `${arrivalDate.getHours().toString().padStart(2, '0')}:${arrivalDate.getMinutes().toString().padStart(2, '0')}`;
    let basePrice = !isDomestic ? Math.floor(300 + Math.random() * 700) : duration > 180 ? Math.floor(150 + Math.random() * 250) : Math.floor(80 + Math.random() * 150);
    const vendorData = vendors.map(vendor => {
      const priceVariation = Math.random() * 80 - 40;
      const price = Math.max(basePrice + priceVariation, 50).toFixed(2);
      const tax = (price * 0.15).toFixed(2);
      return { vendor, price, tax };
    });
    flights.push({
      flightInfo: { flightNumber, airline, origin, destination, departureDate: flightDate, departureTime, arrivalTime, duration: `${durationHours}h ${durationMins}m`, stops: Math.floor(Math.random() * 2) },
      vendors: vendorData
    });
  }
  flights.sort((a, b) => a.flightInfo.departureTime.localeCompare(b.flightInfo.departureTime));
  return flights;
}

function generateMockHotels(city) {
  const hotelPrefixes = ["Grand", "Royal", "Luxury", "Comfort", "Premier", "Elite"];
  const hotelSuffixes = ["Hotel", "Suites", "Inn", "Resort", "Palace", "Lodge"];
  const vendors = ["Booking.com", "Expedia", "Hotels.com", "Agoda"];
  const hotelCount = Math.floor(Math.random() * 6) + 5;
  const hotels = [];
  for (let i = 0; i < hotelCount; i++) {
    const prefix = hotelPrefixes[Math.floor(Math.random() * hotelPrefixes.length)];
    const suffix = hotelSuffixes[Math.floor(Math.random() * hotelSuffixes.length)];
    const hotelName = `${prefix} ${city} ${suffix}`;
    const hotelId = `HTL${Math.floor(100000 + Math.random() * 900000)}`;
    let basePrice = ["Paris", "London", "New York", "Tokyo"].includes(city) ? Math.floor(200 + Math.random() * 300) : ["Rome", "Barcelona", "Sydney", "Berlin"].includes(city) ? Math.floor(150 + Math.random() * 200) : Math.floor(80 + Math.random() * 120);
    const vendorData = vendors.map(vendor => {
      const priceVariation = Math.random() * 40 - 20;
      const price = Math.max(basePrice + priceVariation, 50).toFixed(2);
      const tax = (price * 0.12).toFixed(2);
      return { vendor1: vendor, price1: price, tax1: tax };
    });
    hotels.push([{ hotelName, hotelId, location: city }, vendorData]);
  }
  return hotels;
}

// Destination Details Route
app.get("/destination/:id", async (req, res) => {
  try {
    const destination = await Destination.findById(req.params.id);
    if (!destination) return res.status(404).send("Destination not found");
    res.render("destination-details", { destination });
  } catch (error) {
    console.error("Error fetching destination:", error);
    res.status(500).send("Server Error");
  }
});

// Payment Success Route
app.get("/payment-success", (req, res) => {
  console.log("🔹 Payment Success Route Hit!");
  console.log("Query Params:", req.query);
  const transactionId = req.query.transactionId || "TXN000123";
  const amount = req.query.amount || "0.00";
  const date = new Date().toLocaleDateString();
  res.render("payment-success", { transactionId, amount, date });
});

// Routes
app.use("/", authRoutes);
app.use("/", visitedRoutes);
app.use("/", bookingRoutes);
app.use("/auth", authRoutes);
app.use("/visited", visitedRoutes);
app.use("/destinations", destinationRoutes);
app.use("/booking", bookingRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/payment", paymentRoutes);
app.use("/", editRoutes);
app.use("/edit", editRoutes);
app.use("/api/destinations", destinationRoutes);
app.use("/", favoritesRoutes);
app.use("/favorite", favoriteRoutes);
app.use("/friends", friendRoutes);
app.use("/", MessageRoutes);
app.use('/messages', messagesRoutes);
app.use('/', Ratings);
app.use('/',reservationRoutes);
app.use('/api/reservations', reservationRoutes);
 
// app.js
app.use('/api/destinations', destinationRoutes);

// Home Route
app.get("/", async (req, res) => {
  try {
    const featuredDestinations = await Destination.find({ featured: true });
    res.render("index", { title: "Tourism Recommendation System", featuredDestinations });
  } catch (error) {
    console.error("Error fetching featured destinations:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Dashboard Route
app.get("/dashboard", (req, res) => {
  if (!req.user) return res.redirect("/login");
  res.render("dashboard", { user: req.user });
});



// Test Route
app.get("/test", (req, res) => {
  res.render("index", { title: "Test Page", featuredDestinations: [] });
});

// Error Handling for Unknown Routes
app.use((req, res) => {
  res.status(404).send("Page Not Found");
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("🔥 Uncaught Error:", err.stack);
  res.status(500).send("Something went wrong!");
});

// Session Logging Middleware
app.use((req, res, next) => {
  console.log("Session Data:", req.session);
  next();
});

// Start the server only if this file is run directly
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
}

module.exports = app;
