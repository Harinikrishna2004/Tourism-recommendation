//5 test cases
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
  const Destination = require("../models/Destination");
  const multer = require("multer");
  const authMiddleware = require("../middleware/auth");
  
  describe("Rating Routes", () => {
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
        ratings: [],
      });
      return await destination.save();
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
      await Destination.deleteMany({});
  
      app = express();
      app.use(express.json());
      app.use(express.urlencoded({ extended: true }));
  
      // Mock multer upload
      sinon.stub(multer, "diskStorage").returns({
        destination: sinon.stub(),
        filename: sinon.stub(),
      });
      const mockUpload = {
        single: () => (req, res, next) => {
          req.file = { filename: "test-image.jpg" }; // Simulate file upload
          next();
        },
      };
      sinon.stub(require("../config/upload"), "single").callsFake(mockUpload.single);
  
      // Stub ensureAuthenticated BEFORE importing the router
      sinon.stub(authMiddleware, "ensureAuthenticated").callsFake((req, res, next) => {
        req.user = mockUser;
        console.log("🔍 Mocked authentication: User set to", req.user.username);
        next();
      });
  
      // Import the router AFTER stubbing
      const ratingRoutes = require("../routes/rating");
      console.log("ratingRoutes type:", typeof ratingRoutes, "isFunction:", typeof ratingRoutes === "function");
  
      // Mount the router
      try {
        app.use("/", ratingRoutes);
      } catch (err) {
        console.error("Error mounting router:", err);
        throw err;
      }
  
      agent = request.agent(app);
  
      // Set up EJS as the view engine
      app.set("view engine", "ejs");
      app.set("views", path.join(__dirname, "../views"));
    });
  
    afterEach(() => {
      sinon.restore();
    });
  });