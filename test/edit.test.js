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
  const bcrypt = require("bcryptjs");
  const User = require("../models/User");
  
  describe("Edit Routes", () => {
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
        password: await bcrypt.hash("password123", 10),
        ...overrides,
      });
      return await user.save();
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
          cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }, // 1 day
        })
      );
      app.set("view engine", "ejs");
      app.set("views", "./views");
  
      const editRoutes = require("../routes/Edit");
      app.use("/", editRoutes);
  
      agent = request.agent(app); // Persistent agent for session
    });
  
    afterEach(() => {
      sinon.restore();
    });
  
    describe("GET /edit-account", () => {
  
      it("should redirect to login if no session user", async () => {
        const response = await agent.get("/edit-account").expect(302);
        expect(response.headers.location).to.equal("/login");
      });
  
      it("should redirect to login if user not found in DB", async () => {
        await agent.get("/").set("Cookie", `connect.sid=s:${mockUser.id}`);
        await agent.get("/edit-account").expect((res) => {
          res.session = { user: mockUser };
        });
        const response = await agent.get("/edit-account").expect(302);
        expect(response.headers.location).to.equal("/login");
      });
    });
  
    describe("POST /edit/update-account", () => {
  
      it("should return 401 if no session user", async () => {
        const response = await agent
          .post("/edit/update-account")
          .send({ email: "newemail@example.com", username: "newuser" })
          .expect(401);
        expect(response.body.error).to.equal("Unauthorized request");
      });
    });
  
    describe("GET /edit/get-user", () => {
  
      it("should return 401 if no session user", async () => {
        const response = await agent.get("/edit/get-user").expect(401);
        expect(response.body.error).to.equal("Unauthorized request.");
      });
  
    });
  
    describe("DELETE /delete-account", () => {
  
      it("should return 401 if no session user", async () => {
        const response = await agent.delete("/delete-account").expect(401);
        expect(response.body.error).to.equal("Unauthorized request");
      });
    });
  });