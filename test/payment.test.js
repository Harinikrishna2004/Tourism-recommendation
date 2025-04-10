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
  const Payment = require("../models/Payment");
  const Booking = require("../models/Booking");
  const VisitedPlaces = require("../models/visited");
  const Reservation = require("../models/Reservation");
  const Destination = require("../models/Destination"); // Added import
  const nodemailer = require("nodemailer");
  
  describe("Payment Routes", () => {
    let app, mongoServer, agent;
  
    const mockUser = { username: "testuser" };
  
    const createValidBooking = async () => {
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
  
      const booking = new Booking({
        destination_id: savedDestination._id,
        username: "testuser",
        visit_date: new Date(),
        hotel_price: 500,
        flight_price: 1000,
        payment_status: "Pending",
        amount_paid: 1500,
      });
      return await booking.save();
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
      await Payment.deleteMany({});
      await Booking.deleteMany({});
      await VisitedPlaces.deleteMany({});
      await Reservation.deleteMany({});
      await Destination.deleteMany({}); // Clear Destination collection
  
      app = express();
      app.use(express.json());
      app.use(express.urlencoded({ extended: true }));
  
      // Mock nodemailer
      sinon.stub(nodemailer, "createTransport").returns({
        sendMail: sinon.stub().yields(null, { response: "Email sent" }),
      });
  
      // Import the router
      const paymentRoutes = require("../routes/payment");
  
      // Define the mock authentication middleware
      const mockAuthMiddleware = (req, res, next) => {
        req.user = mockUser;
        console.log("🔍 Mocked authentication: User set to", req.user.username);
        next();
      };
  
      // Manually set up routes with mock middleware where needed
      app.get("/", paymentRoutes.stack.find(layer => layer.route.path === "/").route.stack[0].handle);
      app.post("/complete", mockAuthMiddleware, paymentRoutes.stack.find(layer => layer.route.path === "/complete").route.stack[1].handle);
      app.get("/payment-success", mockAuthMiddleware, paymentRoutes.stack.find(layer => layer.route.path === "/payment-success").route.stack[1].handle);
      app.post("/download-pdf", mockAuthMiddleware, paymentRoutes.stack.find(layer => layer.route.path === "/download-pdf").route.stack[1].handle);
      app.get("/history", mockAuthMiddleware, paymentRoutes.stack.find(layer => layer.route.path === "/history").route.stack[1].handle);
  
      agent = request.agent(app);
  
      // Set up EJS as the view engine and point to the views directory
      app.set("view engine", "ejs");
      app.set("views", path.join(__dirname, "../views"));
    });
  
    afterEach(() => {
      sinon.restore();
    });
  
    describe("GET /", () => {
      it("should return 200 and render payment page with booking", async () => {
        const booking = await createValidBooking();
        const response = await agent.get(`/?booking_id=${booking._id}`).expect(200);
  
        expect(response.text).to.include("payment"); // Adjust based on your payment.ejs content
      });
    });
  
    describe("POST /complete", () => {
      it("should complete payment and return success with redirect URL", async () => {
        const booking = await createValidBooking();
        const response = await agent
          .post("/complete")
          .send({
            booking_id: booking._id,
            amount: 1500,
            username: "testuser",
            payment_method: "Credit Card",
          })
          .expect(200);
  
        expect(response.body.success).to.be.true;
        expect(response.body.redirectUrl).to.include("/payment/payment-success");
      });
    });
  
    describe("GET /payment-success", () => {
      it("should return 200 and render payment success page", async () => {
        const booking = await createValidBooking();
        const payment = new Payment({
          booking_id: booking._id,
          username: "testuser",
          payment_method: "Credit Card",
          transaction_id: "TXN-123",
          payment_status: "Completed",
          amount: 1500,
        });
        await payment.save();
  
        const response = await agent
          .get(`/payment-success?transactionId=${payment.transaction_id}&booking_id=${booking._id}`)
          .expect(200);
  
        expect(response.text).to.include("payment-success"); // Adjust based on your payment-success.ejs content
      });
    });
  
    describe("POST /download-pdf", () => {
      it("should return 200 and generate a PDF", async () => {
        const booking = await createValidBooking();
        const payment = new Payment({
          booking_id: booking._id,
          username: "testuser",
          payment_method: "Credit Card",
          transaction_id: "TXN-123",
          payment_status: "Completed",
          amount: 1500,
        });
        await payment.save();
  
        const response = await agent
          .post("/download-pdf")
          .send({
            transactionId: payment.transaction_id,
            booking_id: booking._id,
            username: "testuser",
            destination: "Test Destination",
            visitDate: booking.visit_date.toISOString().split("T")[0],
            hotelPrice: booking.hotel_price,
            flightPrice: booking.flight_price,
            totalAmount: payment.amount,
            paymentMethod: payment.payment_method,
            date: payment.timestamp.toISOString().split("T")[0],
          })
          .expect(200);
  
        expect(response.headers["content-type"]).to.equal("application/pdf");
        expect(response.headers["content-disposition"]).to.include("attachment; filename=booking-details.pdf");
      });
    });
  
    describe("GET /history", () => {
      it("should return 200 and render payment history page", async () => {
        const booking = await createValidBooking();
        const payment = new Payment({
          booking_id: booking._id,
          username: "testuser",
          payment_method: "Credit Card",
          transaction_id: "TXN-123",
          payment_status: "Completed",
          amount: 1500,
        });
        await payment.save();
  
        const response = await agent.get("/history").expect(200);
  
        expect(response.text).to.include("payment-history"); // Adjust based on your payment-history.ejs content
      });
    });
  });