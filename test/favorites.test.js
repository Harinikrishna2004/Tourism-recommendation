//8 test cases
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
  
  describe("Favorites Routes", () => {
    let app, mongoServer, agent;
  
    const mockUser = {
      id: new mongoose.Types.ObjectId().toString(),
      username: "testuser",
      email: "test@example.com",
    };
  
    const createValidUser = async (overrides = {}) => {
      const user = new User({
        _id: mockUser.id,
        username: "testuser",
        email: "test@example.com",
        password: "hashedpassword",
        favorites: [],
        ...overrides,
      });
      return await user.save();
    };
  
    const createValidDestination = async (overrides = {}) => {
      const destination = new Destination({
        _id: new mongoose.Types.ObjectId(),
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
          cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 },
        })
      );
  
      app.get("/simulate-login", (req, res) => {
        req.session.user = { id: mockUser.id, username: mockUser.username, email: mockUser.email };
        req.user = { id: mockUser.id, username: mockUser.username, email: mockUser.email };
        res.status(200).send("Logged in");
      });
  
      app.use((req, res, next) => {
        if (req.session.user) {
          req.user = req.session.user;
          next();
        } else {
          res.redirect("/login");
        }
      });
  
      const favoritesRoutes = require("../routes/favorites");
      app.use("/", favoritesRoutes);
  
      agent = request.agent(app);
    });
  
    afterEach(() => {
      sinon.restore();
    });
  
    describe("GET /favorites", () => {
      it("should add destination to favorites and redirect to dashboard", async () => {
        await createValidUser();
        const destination = await createValidDestination();
        await simulateLogin(agent);
  
        const response = await agent
          .get("/favorites")
          .query({ dest_id: destination._id.toString(), dest_name: "Paris" }) // Convert to string
          .expect(302);
  
        expect(response.headers.location).to.include(encodeURIComponent("Paris added to favorites"));
        const user = await User.findById(mockUser.id);
        expect(user.favorites.map(id => id.toString())).to.include(destination._id.toString());
      });
  
      it("should not add duplicate destination to favorites", async () => {
        const destination = await createValidDestination();
        await createValidUser({ favorites: [destination._id] });
        await simulateLogin(agent);
  
        const response = await agent
          .get("/favorites")
          .query({ dest_id: destination._id.toString(), dest_name: "Paris" })
          .expect(302);
  
        expect(response.headers.location).to.include(encodeURIComponent("Paris added to favorites"));
        const user = await User.findById(mockUser.id);
        expect(user.favorites.length).to.equal(1);
      });
  
      it("should redirect to login if not authenticated", async () => {
        const response = await agent.get("/favorites").expect(302);
        expect(response.headers.location).to.equal("/login");
      });
    });
  
    describe("DELETE /api/favorites", () => {
      it("should remove destination from favorites", async () => {
        const destination = await createValidDestination();
        await createValidUser({ favorites: [destination._id] });
        await simulateLogin(agent);
  
        const response = await agent
          .delete("/api/favorites")
          .send({ destinationId: destination._id.toString() })
          .expect(200);
  
        expect(response.body).to.deep.equal({ success: true, message: "Destination removed from favorites" });
        const user = await User.findById(mockUser.id);
        expect(user.favorites.map(id => id.toString())).to.not.include(destination._id.toString());
      });
  
      it("should return 400 if destinationId is missing", async () => {
        await createValidUser();
        await simulateLogin(agent);
  
        const response = await agent.delete("/api/favorites").send({}).expect(400);
        expect(response.body).to.deep.equal({ success: false, error: "Destination ID is required" });
      });
  
      it("should return 404 if destination not found", async () => {
        await createValidUser();
        await simulateLogin(agent);
  
        const response = await agent
          .delete("/api/favorites")
          .send({ destinationId: new mongoose.Types.ObjectId().toString() })
          .expect(404);
        expect(response.body).to.deep.equal({ success: false, error: "Destination not found" });
      });
  
      it("should return 400 if destination not in favorites", async () => {
        const destination = await createValidDestination();
        await createValidUser({ favorites: [] });
        await simulateLogin(agent);
  
        const response = await agent
          .delete("/api/favorites")
          .send({ destinationId: destination._id.toString() })
          .expect(400);
        expect(response.body).to.deep.equal({ success: false, error: "Destination not in favorites" });
      });
  
      it("should return 302 redirect to login if not authenticated", async () => {
        const response = await agent.delete("/api/favorites").send({ destinationId: "some-id" }).expect(302);
        expect(response.headers.location).to.equal("/login");
      });
    });
  });