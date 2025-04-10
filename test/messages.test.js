// 5 test cases
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
  const Message = require("../models/message");
  const Destination = require("../models/Destination");
  
  describe("Messages Routes", () => {
    let app, mongoServer, agent;
  
    const mockUser = { username: "testuser" };
  
    const createValidMessage = async (overrides = {}) => {
      const destination = new Destination({
        name: "Test Destination",
        location: {
          city: "Test City",
          country: "Test Country",
          coordinates: { coordinates: [0, 0] }, // Assuming GeoJSON format
        },
        description: "A test destination",
        amount: 100,
        budget: "low",
        image: "test-image.jpg",
        isIndian: true,
      });
      const savedDestination = await destination.save();
  
      const message = new Message({
        senderName: "testuser",
        receiverName: "friend1",
        destinationId: savedDestination._id,
        ...overrides,
      });
      return await message.save();
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
      await Message.deleteMany({});
      await Destination.deleteMany({});
  
      app = express();
      app.use(express.json());
      app.use(express.urlencoded({ extended: true }));
  
      // Import the router
      const messageRoutes = require("../routes/messages");
  
      // Extract the route handler directly
      const routeHandler = messageRoutes.stack.find(layer => layer.route.path === "/").route.stack[1].handle;
  
      // Define the mock authentication middleware
      const mockAuthMiddleware = (req, res, next) => {
        req.user = mockUser;
        console.log("🔍 Mocked authentication: User set to", req.user.username);
        next();
      };
  
      // Manually set up the route with the mock middleware
      app.get("/", mockAuthMiddleware, routeHandler);
  
      agent = request.agent(app);
  
      // Set up EJS as the view engine and point to the views directory
      app.set("view engine", "ejs");
      app.set("views", path.join(__dirname, "../views")); // Adjusted to point to views/
    });
  
    afterEach(() => {
      sinon.restore();
    });
  
    describe("GET /", () => {
      it("should return 200 and render messages page with no messages", async () => {
        const response = await agent.get("/").expect(200);
  
        expect(response.text).to.include("Messages");
        expect(response.text).to.not.include("Error");
      });
  
      it("should return 200 and render sent messages for the current user", async () => {
        await createValidMessage({ senderName: "testuser", receiverName: "friend1" });
  
        const response = await agent.get("/").expect(200);
  
        expect(response.text).to.include("Messages");
        expect(response.text).to.include("testuser");
        expect(response.text).to.include("friend1");
      });
  
      it("should return 200 and render received messages for the current user", async () => {
        await createValidMessage({ senderName: "friend1", receiverName: "testuser" });
  
        const response = await agent.get("/").expect(200);
  
        expect(response.text).to.include("Messages");
        expect(response.text).to.include("testuser");
        expect(response.text).to.include("friend1");
      });
  
      it("should filter out messages with invalid destinationId", async () => {
        await Message.create({
          senderName: "testuser",
          receiverName: "friend1",
          destinationId: null,
        }).catch(() => {}); // Ignore validation error
  
        const response = await agent.get("/").expect(200);
  
        expect(response.text).to.include("Messages");
        expect(response.text).to.include("testuser");
        expect(response.text).to.not.include("friend1");
      });
  
      it("should return 200 with error state on database failure", async () => {
        sinon.stub(Message, "find").throws(new Error("Database error"));
  
        const response = await agent.get("/").expect(200);
  
        expect(response.text).to.include("Messages - Error");
        expect(response.text).to.include("testuser");
        expect(response.text).to.not.include("friend1");
      });
    });
  });