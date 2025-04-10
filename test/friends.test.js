//5 test cases
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
  
  describe("Friends Routes", () => {
    let app, mongoServer, agent;
  
    const mockUser = {
      id: new mongoose.Types.ObjectId().toString(),
      username: "testuser",
      email: "test@example.com",
    };
  
    const createValidUser = async (overrides = {}) => {
      const user = new User({
        _id: overrides.id || new mongoose.Types.ObjectId(),
        username: overrides.username || "testuser",
        email: overrides.email || "test@example.com",
        password: "hashedpassword",
        ...overrides,
      });
      return await user.save();
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
      app.set("view engine", "ejs");
      app.set("views", "./views");
  
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
          res.redirect("/auth/login");
        }
      });
  
      const friendsRoutes = require("../routes/friends");
      app.use("/friends", friendsRoutes);
  
      agent = request.agent(app);
    });
  
    afterEach(() => {
      sinon.restore();
    });
  
    describe("GET /friends", () => {
      it("should render friends page with list of friends and query params", async () => {
        await createValidUser();
        await createValidUser({ username: "friend1", email: "friend1@example.com" });
        await createValidUser({ username: "friend2", email: "friend2@example.com" });
        await simulateLogin(agent);
  
        const response = await agent
          .get("/friends")
          .query({ dest_id: "12345", dest_name: "Paris" })
          .expect(200);
  
        expect(response.text).to.include("friends"); // Assuming 'friends' is in the template name or content
        expect(response.text).to.include("friend1");
        expect(response.text).to.include("friend2");
        expect(response.text).to.include("testuser"); // currentUser
        expect(response.text).to.include("12345"); // destId
        expect(response.text).to.include("Paris"); // destName
        expect(response.text).to.not.include("Error loading friends list");
      });
  
      it("should render friends page with empty list if no other users exist", async () => {
        await createValidUser();
        await simulateLogin(agent);
  
        const response = await agent.get("/friends").expect(200);
        expect(response.text).to.include("friends");
        expect(response.text).to.include("testuser");
        expect(response.text).to.not.include("friend1");
      });
  
      it("should redirect to login if not authenticated", async () => {
        const response = await agent.get("/friends").expect(302);
        expect(response.headers.location).to.equal("/auth/login");
      });
  
      it("should render friends page with error on server error", async () => {
        await createValidUser();
        await simulateLogin(agent);
        sinon.stub(User, "find").throws(new Error("Database error"));
  
        const response = await agent.get("/friends").expect(200);
        expect(response.text).to.include("friends");
        expect(response.text).to.include("Error loading friends list");
        expect(response.text).to.include("Unknown"); // currentUser set to "Unknown" on error
      });
  
      it("should render friends page without query params if not provided", async () => {
        await createValidUser();
        await createValidUser({ username: "friend1", email: "friend1@example.com" });
        await simulateLogin(agent);
  
        const response = await agent.get("/friends").expect(200);
        expect(response.text).to.include("friends");
        expect(response.text).to.include("testuser");
        expect(response.text).to.include("friend1");
        expect(response.text).to.not.include("12345"); // No destId
        expect(response.text).to.not.include("Paris"); // No destName
      });
    });
  });