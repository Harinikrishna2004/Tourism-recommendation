//4 test cases
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
const User = require("../models/User");
const Destination = require("../models/Destination");

describe("Favourite Routes", () => {
  let app, mongoServer, agent;

  const mockUser = {
    id: new mongoose.Types.ObjectId().toString(),
    username: "testuser",
    email: "test@example.com",
  };

  // Helper to create a valid user
  const createValidUser = async (overrides = {}) => {
    const user = new User({
      _id: mockUser.id,
      username: "testuser",
      email: "test@example.com",
      password: "hashedpassword", // Assume hashed in real app
      favorites: [],
      ...overrides,
    });
    return await user.save();
  };

  // Helper to create a valid destination
  const createValidDestination = async (overrides = {}) => {
    const destination = new Destination({
      name: "Paris",
      description: "City of Lights",
      location: { country: "France", city: "Paris", coordinates: { type: "Point", coordinates: [2.3522, 48.8566] } },
      isIndian: false,
      image: "paris.jpg",
      category: ["city"],
      budget: "high",
      amount: 1000,
      bestSeasons: ["spring"],
      ratings: [],
      averageRating: 0,
      ...overrides,
    });
    return await destination.save();
  };

  // Helper to simulate login
  const simulateLogin = async (agent) => {
    await agent.get("/simulate-login").expect(200);
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
    await User.deleteMany({});
    await Destination.deleteMany({});

    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(
      session({
        secret: "test-secret",
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }, // 1 day
      })
    );
    app.set("view engine", "ejs");
    app.set("views", "./views");

    // Define simulate-login route BEFORE authentication middleware
    app.get("/simulate-login", (req, res) => {
      req.session.user = { id: mockUser.id, username: mockUser.username, email: mockUser.email };
      req.user = { id: mockUser.id, username: mockUser.username, email: mockUser.email };
      res.status(200).send("Logged in");
    });

    // Mock ensureAuthenticated middleware
    app.use((req, res, next) => {
      if (req.session.user) {
        req.user = req.session.user;
        next();
      } else {
        res.redirect("/login");
      }
    });

    const favoriteRoutes = require("../routes/favorite");
    app.use("/favorite", favoriteRoutes);

    agent = request.agent(app); // Persistent agent for session
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("GET /favorite", () => {
    it("should render favorites page with user's favorite destinations", async () => {
      const user = await createValidUser();
      const destination = await createValidDestination({
        ratings: [{ user: mockUser.username, score: 4, review: "Great place!" }],
      });
      await User.updateOne({ _id: user._id }, { $push: { favorites: destination._id } });
      await simulateLogin(agent);

      const response = await agent.get("/favorite").expect(200);
      expect(response.text).to.include("favorites");
      expect(response.text).to.include("Paris"); // Assuming favorites.ejs renders destination names
    });

    it("should render favorites page with empty list if no favorites", async () => {
      await createValidUser();
      await simulateLogin(agent);

      const response = await agent.get("/favorite").expect(200);
      expect(response.text).to.include("favorites");
    });

    it("should redirect to login if not authenticated", async () => {
      const response = await agent.get("/favorite").expect(302);
      expect(response.headers.location).to.equal("/login");
    });

    it("should handle missing destination in favorites gracefully", async () => {
      const user = await createValidUser();
      await User.updateOne({ _id: user._id }, { $push: { favorites: new mongoose.Types.ObjectId() } });
      await simulateLogin(agent);

      const response = await agent.get("/favorite").expect(200);
      expect(response.text).to.include("favorites");
    });
  });
});