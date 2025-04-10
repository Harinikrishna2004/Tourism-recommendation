//11 test cases
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
  const Destination = require("../models/Destination");
  
  describe("Auth Routes", () => {
    let app, mongoServer;
  
    const mockEnsureAuthenticated = (req, res, next) => {
      req.session = req.session || {};
      req.session.user = { id: new mongoose.Types.ObjectId().toString(), username: "testuser", email: "test@example.com" };
      req.user = req.session.user;
      next();
    };
  
    const mockTransporter = {
      sendMail: sinon.stub().resolves(),
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
        })
      );
      app.set("view engine", "ejs");
      app.set("views", "./views");
  
      const authModule = require("../middleware/auth");
      sinon.stub(authModule, "ensureAuthenticated").callsFake(mockEnsureAuthenticated);
  
      const nodemailer = require("nodemailer");
      sinon.stub(nodemailer, "createTransport").returns(mockTransporter);
  
      const authRoutes = require("../routes/auth");
      app.use("/", authRoutes);
      
    });
  
    afterEach(() => {
      sinon.restore();
    });
  
  
    describe("GET /register", () => {
      it("should render register page", async () => {
        const response = await request(app).get("/register").expect(200);
        expect(response.text).to.be.a("string");
      });
    });
  
    describe("POST /register", () => {
      it("should register a new user successfully", async () => {
        const response = await request(app)
          .post("/register")
          .send({ username: "newuser", email: "new@example.com", password: "password123" })
          .expect(201);
  
        expect(response.body.success).to.be.true;
        expect(response.body.message).to.equal("User registered successfully!");
  
        const user = await User.findOne({ username: "newuser" });
        expect(user).to.exist;
      });
  
      it("should return 401 if user already exists", async () => {
        await new User({
          username: "existinguser",
          email: "exist@example.com",
          password: await bcrypt.hash("password123", 10),
        }).save();
  
        const response = await request(app)
          .post("/register")
          .send({ username: "newuser", email: "exist@example.com", password: "password123" })
          .expect(401);
  
        expect(response.body.success).to.be.false;
        expect(response.body.error).to.equal("User already exists");
      });
    });
  
    describe("POST /login", () => {
      it("should login successfully with correct credentials", async () => {
        await new User({
          username: "testuser",
          email: "test@example.com",
          password: await bcrypt.hash("password123", 10),
        }).save();
  
        const response = await request(app)
          .post("/login")
          .send({ username: "testuser", password: "password123" })
          .expect(200);
  
        expect(response.body.success).to.be.true;
        expect(response.body.message).to.equal("Login successful!");
      });
  
      it("should return 401 with invalid credentials", async () => {
        await new User({
          username: "testuser",
          email: "test@example.com",
          password: await bcrypt.hash("password123", 10),
        }).save();
  
        const response = await request(app)
          .post("/login")
          .send({ username: "testuser", password: "wrongpassword" })
          .expect(401);
  
        expect(response.body.success).to.be.false;
        expect(response.body.error).to.equal("Invalid credentials");
      });
    });
  
  
    describe("GET /dashboard", () => {
      it("should render dashboard with featured destinations", async () => {
        await new Destination({
          name: "Paris",
          description: "City of Lights",
          location: { country: "France", city: "Paris", coordinates: { type: "Point", coordinates: [2.3522, 48.8566] } },
          isIndian: false,
          image: "paris.jpg",
          budget: "high",
          amount: 1000,
        }).save();
  
        const response = await request(app).get("/dashboard").expect(200);
        expect(response.text).to.include("Dashboard");
        expect(response.text).to.include("testuser");
      });
  
      it("should return 500 on server error", async () => {
        sinon.stub(Destination, "find").throws(new Error("Database error"));
        const response = await request(app).get("/dashboard").expect(500);
        expect(response.text).to.equal("Server error");
      });
    });
  
    describe("GET /forgot-password", () => {
      it("should render forgot-password page", async () => {
        const response = await request(app).get("/forgot-password").expect(200);
        expect(response.text).to.include("Forgot Password");
      });
    });
  
    describe("POST /forgot-password", () => {
      it("should send OTP and redirect to verify-otp", async () => {
        await new User({
          username: "testuser",
          email: "test@example.com",
          password: await bcrypt.hash("password123", 10),
        }).save();
  
        const response = await request(app)
          .post("/forgot-password")
          .send({ email: "test@example.com" })
          .expect(302);
  
        expect(response.headers.location).to.equal("/verify-otp");
        expect(mockTransporter.sendMail.calledOnce).to.be.true;
      });
  
      it("should render error if user not found", async () => {
        const response = await request(app)
          .post("/forgot-password")
          .send({ email: "nonexistent@example.com" })
          .expect(200);
  
        expect(response.text).to.include("User not found");
      });
    });
  
  
  
    describe("GET /logout", () => {
      it("should destroy session and redirect to home", async () => {
        const response = await request(app).get("/logout").expect(302);
        expect(response.headers.location).to.equal("/");
      });
    });
  });