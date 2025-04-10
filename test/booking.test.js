//9 test cases

(async () => {
    const chai = await import("chai");
    global.expect = chai.expect;
  })();
  
  const request = require("supertest");
  const express = require("express");
  const session = require("express-session");
  const mongoose = require("mongoose");
  const { MongoMemoryServer } = require("mongodb-memory-server");
  const sinon = require("sinon");
  const Booking = require("../models/Booking");
  const Destination = require("../models/Destination");
  
  describe("Booking Routes", () => {
    let app, mongoServer;
  
    // Mock the ensureAuthenticated middleware
    const mockEnsureAuthenticated = (req, res, next) => {
      req.session = req.session || {};
      req.session.user = { username: "testuser" }; // Simulate authenticated user
      req.user = req.session.user;
      next();
    };
  
    before(async () => {
      mongoServer = await MongoMemoryServer.create();
      const uri = mongoServer.getUri();
      await mongoose.connect(uri);
    });
  
    after(async () => {
      await mongoose.disconnect();
      await mongoServer.stop();
    });
  
    beforeEach(async () => {
      await Booking.deleteMany({});
      await Destination.deleteMany({});
  
      // Set up a fresh Express app for each test
      app = express();
      app.use(express.json());
      app.use(express.urlencoded({ extended: true }));
      app.use(
        session({
          secret: "test-secret",
          resave: false,
          saveUninitialized: false,
        })
      );
      app.set("view engine", "ejs");
      app.set("views", "./views");
  
      // Stub ensureAuthenticated before requiring bookingRoutes
      const authModule = require("../middleware/auth");
      sinon.stub(authModule, "ensureAuthenticated").callsFake(mockEnsureAuthenticated);
  
      // Require bookingRoutes after stubbing
      const bookingRoutes = require("../routes/booking");
      app.use("/booking", bookingRoutes);
    });
  
    afterEach(() => {
      sinon.restore(); // Clean up all stubs
    });
  
    describe("GET /booking", () => {
      it("should return 400 if destination_name is not provided", async () => {
        const response = await request(app)
          .get("/booking/booking")
          .expect(400);
  
        expect(response.text).to.equal("No destination specified");
      });
  
      it("should return 404 if destination is not found", async () => {
        const response = await request(app)
          .get("/booking/booking")
          .query({ destination_name: "NonExistent" })
          .expect(404);
  
        expect(response.text).to.equal("Destination not found");
      });
  
      it("should render booking page with destination data", async () => {
        const destination = new Destination({
          name: "Paris",
          description: "City of Lights",
          location: {
            country: "France",
            city: "Paris",
            coordinates: { type: "Point", coordinates: [2.3522, 48.8566] },
          },
          isIndian: false,
          images: [],
          image: "paris.jpg",
          category: ["city"],
          preferredActivities: ["sightseeing"],
          budget: "high",
          amount: 1000,
          bestSeasons: ["spring"],
          activities: [],
          ratings: [],
        });
        await destination.save();
  
        const response = await request(app)
          .get("/booking/booking")
          .query({ destination_name: "Paris" })
          .expect(200);
  
        expect(response.text).to.include("Paris");
      });
  
      it("should return 500 on server error", async () => {
        sinon.stub(Destination, "findOne").throws(new Error("Database error"));
  
        const response = await request(app)
          .get("/booking/booking")
          .query({ destination_name: "Paris" })
          .expect(500);
  
        expect(response.text).to.equal("Server error");
      });
    });
  
    describe("POST /submit-booking", () => {
  
      it("should return 400 if required fields are missing", async () => {
        const response = await request(app)
          .post("/booking/submit-booking")
          .send({})
          .expect(400);
  
        expect(response.body.success).to.be.false;
        expect(response.body.message).to.equal("Missing required fields");
      });
  
      it("should return 400 if destination is not found", async () => {
        const response = await request(app)
          .post("/booking/submit-booking")
          .send({ destination_name: "NonExistent", visit_date: "2025-03-15", amount_paid: 2000, hotel_price: 1000, flight_price: 1000 })
          .expect(400);
  
        expect(response.body.success).to.be.false;
        expect(response.body.message).to.equal("Destination not found");
      });
  
      it("should return 400 if amount_paid does not match expected total", async () => {
        const destination = new Destination({
          name: "Paris",
          description: "City of Lights",
          location: {
            country: "France",
            city: "Paris",
            coordinates: { type: "Point", coordinates: [2.3522, 48.8566] },
          },
          isIndian: false,
          images: [],
          image: "paris.jpg",
          category: ["city"],
          preferredActivities: ["sightseeing"],
          budget: "high",
          amount: 1000,
          bestSeasons: ["spring"],
          activities: [],
          ratings: [],
        });
        await destination.save();
  
        const response = await request(app)
          .post("/booking/submit-booking")
          .send({ destination_name: "Paris", visit_date: "2025-03-15", amount_paid: 1500, hotel_price: 1000, flight_price: 1000 })
          .expect(400);
  
        expect(response.body.success).to.be.false;
        expect(response.body.message).to.equal("Incorrect total amount. Expected: 2000, Received: 1500");
      });
  
      it("should create a booking successfully", async () => {
        const destination = new Destination({
          name: "Paris",
          description: "City of Lights",
          location: {
            country: "France",
            city: "Paris",
            coordinates: { type: "Point", coordinates: [2.3522, 48.8566] },
          },
          isIndian: false,
          images: [],
          image: "paris.jpg",
          category: ["city"],
          preferredActivities: ["sightseeing"],
          budget: "high",
          amount: 1000,
          bestSeasons: ["spring"],
          activities: [],
          ratings: [],
        });
        await destination.save();
  
        const response = await request(app)
          .post("/booking/submit-booking")
          .send({ destination_name: "Paris", visit_date: "2025-03-15", amount_paid: 2000, hotel_price: 1000, flight_price: 1000 })
          .expect(201);
  
        expect(response.body.success).to.be.true;
        expect(response.body.message).to.equal("Booking confirmed!");
        expect(response.body.redirect).to.match(/\/payment\?booking_id=/);
  
        const booking = await Booking.findOne({ username: "testuser" });
        expect(booking).to.exist;
        expect(booking.destination_id.toString()).to.equal(destination._id.toString());
        expect(booking.amount_paid).to.equal(2000);
        expect(booking.payment_status).to.equal("Pending");
      });
  
      it("should return 500 on server error", async () => {
        sinon.stub(Booking.prototype, "save").throws(new Error("Database error"));
  
        const destination = new Destination({
          name: "Paris",
          description: "City of Lights",
          location: {
            country: "France",
            city: "Paris",
            coordinates: { type: "Point", coordinates: [2.3522, 48.8566] },
          },
          isIndian: false,
          images: [],
          image: "paris.jpg",
          category: ["city"],
          preferredActivities: ["sightseeing"],
          budget: "high",
          amount: 1000,
          bestSeasons: ["spring"],
          activities: [],
          ratings: [],
        });
        await destination.save();
  
        const response = await request(app)
          .post("/booking/submit-booking")
          .send({ destination_name: "Paris", visit_date: "2025-03-15", amount_paid: 2000, hotel_price: 1000, flight_price: 1000 })
          .expect(500);
  
        expect(response.body.success).to.be.false;
        expect(response.body.message).to.include("Error processing booking");
      });
    });
  });