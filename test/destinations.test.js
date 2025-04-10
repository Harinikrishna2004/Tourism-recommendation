//16 test cases
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
  const Destination = require("../models/Destination");
  
  describe("Destination Routes", () => {
    let app, mongoServer;
  
    const mockUser = { id: new mongoose.Types.ObjectId().toString(), username: "testuser" };
  
    // Helper function to create a valid destination
    const createValidDestination = (overrides = {}) => ({
      name: "Paris",
      description: "City of Lights",
      location: { country: "France", city: "Paris", coordinates: { type: "Point", coordinates: [2.3522, 48.8566] } },
      isIndian: false,
      image: "paris.jpg",
      category: ["city"],
      budget: "high",
      amount: 1000,
      bestSeasons: ["spring"],
      ...overrides,
    });
  
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
      app.use(
        session({
          secret: "test-secret",
          resave: false,
          saveUninitialized: false,
        })
      );
      app.set("view engine", "ejs");
      app.set("views", "./views");
  
      app.use((req, res, next) => {
        req.user = mockUser;
        next();
      });
  
      const destinationRoutes = require("../routes/destinations");
      app.use("/destinations", destinationRoutes);
    });
  
    afterEach(() => {
      sinon.restore();
    });
  
  
    describe("GET /destinations/", () => {
      it("should return all destinations", async () => {
        const destination = await new Destination(createValidDestination()).save();
        const response = await request(app).get("/destinations/").expect(200);
        expect(response.body).to.be.an("array");
        expect(response.body[0].name).to.equal("Paris");
      });
  
      it("should return 500 on error", async () => {
        sinon.stub(Destination, "find").throws(new Error("Database error"));
        const response = await request(app).get("/destinations/").expect(500);
        expect(response.body.error).to.equal("Failed to fetch destinations");
      });
    });
  
    describe("GET /destinations/:id", () => {
      it("should return a single destination as JSON for XHR request", async () => {
        const destination = await new Destination(createValidDestination()).save();
        const response = await request(app)
          .get(`/destinations/${destination._id}`)
          .set("X-Requested-With", "XMLHttpRequest")
          .expect(200);
        expect(response.body.name).to.equal("Paris");
      });
  
      it("should return 404 if destination not found", async () => {
        const response = await request(app)
          .get(`/destinations/${new mongoose.Types.ObjectId()}`)
          .expect(404);
        expect(response.body.error).to.equal("Destination not found");
      });
  
      it("should return 500 on error", async () => {
        sinon.stub(Destination, "findById").throws(new Error("Database error"));
        const response = await request(app)
          .get(`/destinations/${new mongoose.Types.ObjectId()}`)
          .expect(500);
        expect(response.body.error).to.equal("Failed to fetch destination");
      });
    });
  
  
    describe("POST /destinations/filter", () => {
      it("should filter destinations by searchQuery", async () => {
        await new Destination(createValidDestination({ name: "Paris" })).save();
        await new Destination(createValidDestination({ name: "London" })).save();
        const response = await request(app)
          .post("/destinations/filter")
          .send({ searchQuery: "par" })
          .expect(200);
        expect(response.body.success).to.be.true;
        expect(response.body.destinations).to.have.lengthOf(1);
        expect(response.body.destinations[0].name).to.equal("Paris");
      });
  
      it("should filter destinations by budget", async () => {
        await new Destination(createValidDestination({ name: "Paris", budget: "high" })).save();
        await new Destination(createValidDestination({ name: "London", budget: "low" })).save();
        const response = await request(app)
          .post("/destinations/filter")
          .send({ budget: "high" })
          .expect(200);
        expect(response.body.destinations).to.have.lengthOf(1);
        expect(response.body.destinations[0].name).to.equal("Paris");
      });
  
      it("should return 500 on error", async () => {
        sinon.stub(Destination, "find").throws(new Error("Database error"));
        const response = await request(app)
          .post("/destinations/filter")
          .send({ budget: "high" })
          .expect(500);
        expect(response.body.success).to.be.false;
        expect(response.body.error).to.equal("Internal Server Error");
      });
    });
  
    describe("POST /destinations/", () => {
      it("should create a new destination", async () => {
        const newDestination = createValidDestination();
        const response = await request(app)
          .post("/destinations/")
          .send(newDestination)
          .expect(201);
        expect(response.body.name).to.equal("Paris");
        const savedDestination = await Destination.findOne({ name: "Paris" });
        expect(savedDestination).to.exist;
      });
  
      it("should return 500 on error", async () => {
        sinon.stub(Destination.prototype, "save").throws(new Error("Database error"));
        const response = await request(app)
          .post("/destinations/")
          .send(createValidDestination())
          .expect(500);
        expect(response.body.error).to.equal("Failed to add destination");
      });
    });
  
    describe("PUT /destinations/:id", () => {
      it("should update a destination", async () => {
        const destination = await new Destination(createValidDestination()).save();
        const updatedData = createValidDestination({ name: "Updated Paris", budget: "low" });
        const response = await request(app)
          .put(`/destinations/${destination._id}`)
          .send(updatedData)
          .expect(200);
        expect(response.body.name).to.equal("Updated Paris");
        expect(response.body.budget).to.equal("low");
      });
  
      it("should return 404 if destination not found", async () => {
        const response = await request(app)
          .put(`/destinations/${new mongoose.Types.ObjectId()}`)
          .send(createValidDestination({ name: "Updated Paris" }))
          .expect(404);
        expect(response.body.error).to.equal("Destination not found");
      });
  
      it("should return 500 on error", async () => {
        sinon.stub(Destination, "findByIdAndUpdate").throws(new Error("Database error"));
        const response = await request(app)
          .put(`/destinations/${new mongoose.Types.ObjectId()}`)
          .send(createValidDestination({ name: "Updated Paris" }))
          .expect(500);
        expect(response.body.error).to.equal("Failed to update destination");
      });
    });
  
    describe("DELETE /destinations/:id", () => {
      it("should delete a destination", async () => {
        const destination = await new Destination(createValidDestination()).save();
        const response = await request(app)
          .delete(`/destinations/${destination._id}`)
          .expect(200);
        expect(response.body.message).to.equal("Destination deleted successfully");
        const deleted = await Destination.findById(destination._id);
        expect(deleted).to.be.null;
      });
  
      it("should return 404 if destination not found", async () => {
        const response = await request(app)
          .delete(`/destinations/${new mongoose.Types.ObjectId()}`)
          .expect(404);
        expect(response.body.error).to.equal("Destination not found");
      });
  
      it("should return 500 on error", async () => {
        sinon.stub(Destination, "findByIdAndDelete").throws(new Error("Database error"));
        const response = await request(app)
          .delete(`/destinations/${new mongoose.Types.ObjectId()}`)
          .expect(500);
        expect(response.body.error).to.equal("Failed to delete destination");
      });
    });
  });