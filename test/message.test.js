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
  const Message = require("../models/message");
  
  describe("Message Routes", () => {
    let app, mongoServer, agent;
  
    const mockPayload = {
      destinationId: new mongoose.Types.ObjectId().toString(),
      senderName: "testuser",
      receiverName: "friend1",
    };
  
    const createValidMessage = async (overrides = {}) => {
      const message = new Message({
        senderName: "testuser",
        receiverName: "friend1",
        destinationId: new mongoose.Types.ObjectId().toString(),
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
  
      app = express();
      app.use(express.json());
      app.use(express.urlencoded({ extended: true }));
  
      const messageRoutes = require("../routes/message"); // Path to your routes/message.js
      app.use("/", messageRoutes);
  
      agent = request.agent(app);
    });
  
    afterEach(() => {
      sinon.restore();
    });
  
    describe("POST /share-destination", () => {
      it("should save a message and return success", async () => {
        const response = await agent
          .post("/share-destination")
          .send(mockPayload)
          .expect(200);
  
        expect(response.body).to.deep.equal({ success: true });
  
        const message = await Message.findOne({ senderName: "testuser" });
        expect(message).to.exist;
        expect(message.senderName).to.equal(mockPayload.senderName);
        expect(message.receiverName).to.equal(mockPayload.receiverName);
        expect(message.destinationId.toString()).to.equal(mockPayload.destinationId);
      });
  
      it("should return 400 if destinationId is missing", async () => {
        const payload = { senderName: "testuser", receiverName: "friend1" };
        const response = await agent
          .post("/share-destination")
          .send(payload)
          .expect(400);
  
        expect(response.body).to.deep.equal({ error: "Missing required fields" });
        const messages = await Message.find({});
        expect(messages.length).to.equal(0); // No message should be saved
      });
  
      it("should return 400 if senderName is missing", async () => {
        const payload = { destinationId: mockPayload.destinationId, receiverName: "friend1" };
        const response = await agent
          .post("/share-destination")
          .send(payload)
          .expect(400);
  
        expect(response.body).to.deep.equal({ error: "Missing required fields" });
        const messages = await Message.find({});
        expect(messages.length).to.equal(0);
      });
  
      it("should return 400 if receiverName is missing", async () => {
        const payload = { destinationId: mockPayload.destinationId, senderName: "testuser" };
        const response = await agent
          .post("/share-destination")
          .send(payload)
          .expect(400);
  
        expect(response.body).to.deep.equal({ error: "Missing required fields" });
        const messages = await Message.find({});
        expect(messages.length).to.equal(0);
      });
  
      it("should return 500 on server error", async () => {
        sinon.stub(Message.prototype, "save").throws(new Error("Database error"));
  
        const response = await agent
          .post("/share-destination")
          .send(mockPayload)
          .expect(500);
  
        expect(response.body).to.deep.equal({ error: "Database error" });
        const messages = await Message.find({});
        expect(messages.length).to.equal(0); // No message should be saved
      });
    });
  });