//2 test cases
(async () => {
    const chai = await import("chai");
    global.expect = chai.expect;
  })();
  
  const request = require("supertest");
  const express = require("express");
  const mongoose = require("mongoose");
  const { MongoMemoryServer } = require("mongodb-memory-server");
  const sinon = require("sinon");
  const path = require("path");
  const Reservation = require("../models/Reservation");
  const Destination = require("../models/Destination");
  
  describe("Reservation Routes", () => {
    let app, mongoServer, agent;
  
    const mockUser = { username: "testuser" };
  
    const createValidDestination = async () => {
      const destination = new Destination({
        name: "Test Destination",
        location: {
          city: "Test City",
          country: "Test Country",
          coordinates: { coordinates: [0, 0] }, // GeoJSON format
        },
        description: "A test destination",
        amount: 100,
        budget: "low",
        image: "test-image.jpg",
        isIndian: true,
      });
      return await destination.save();
    };
  
    const createValidReservation = async (username, destinationId) => {
      const reservation = new Reservation({
        username,
        destination_id: destinationId,
        reservation_date: new Date(),
        status: "Confirmed", // Ensure status is included
        payment_id: new mongoose.Types.ObjectId(), // Mock payment ID
        visit_date: new Date(), // Required field
        booking_id: new mongoose.Types.ObjectId(), // Mock booking ID
      });
      return await reservation.save();
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
      await Reservation.deleteMany({});
      await Destination.deleteMany({});
  
      app = express();
      app.use(express.json());
      app.use(express.urlencoded({ extended: true }));
  
      // Mock session middleware
      const mockSessionMiddleware = (req, res, next) => {
        req.session = { user: mockUser };
        console.log("🔍 Mocked session: User set to", req.session.user.username);
        next();
      };
  
      // Import the router
      const reservationRoutes = require("../routes/reservations");
  
      // Mount the router with mock session middleware
      app.use("/", mockSessionMiddleware, reservationRoutes);
  
      agent = request.agent(app);
  
      // Set up EJS as the view engine (optional)
      app.set("view engine", "ejs");
      app.set("views", path.join(__dirname, "../views"));
    });
  
    afterEach(() => {
      sinon.restore();
    });
  
    describe("GET /user-reservations", () => {
  
      it("should return an empty array if no reservations exist for the user", async () => {
        const response = await agent.get("/user-reservations").expect(200);
  
        expect(response.body).to.be.an("array");
        expect(response.body).to.have.lengthOf(0);
      });
  
      it("should handle database errors gracefully", async () => {
        // Stub Reservation.find to throw an error
        sinon.stub(Reservation, "find").throws(new Error("Database failure"));
  
        const response = await agent.get("/user-reservations").expect(500);
  
        expect(response.body).to.have.property("error", "Server error");
      });
    });
  });