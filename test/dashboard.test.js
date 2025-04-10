//2 test cases

(async () => {
    const chai = await import("chai");
    global.expect = chai.expect;
  })();
  
  const request = require("supertest");
  const express = require("express");
  const session = require("express-session");
  const sinon = require("sinon");
  
  describe("Dashboard Routes", () => {
    let app;
  
    // Mock the ensureAuthenticated middleware
    const mockEnsureAuthenticated = (req, res, next) => {
      req.session = req.session || {};
      req.session.user = { username: "testuser" }; // Simulate authenticated user
      req.user = req.session.user;
      next();
    };
  
    beforeEach(async () => {
      // Set up a fresh Express app for each test
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
  
      // Stub ensureAuthenticated before requiring dashboardRoutes
      const authModule = require("../middleware/auth");
      sinon.stub(authModule, "ensureAuthenticated").callsFake(mockEnsureAuthenticated);
  
      // Require dashboardRoutes after stubbing
      const dashboardRoutes = require("../routes/dashboard");
      app.use("/", dashboardRoutes); // Mount at root since the route is '/dashboard'
    });
  
    afterEach(() => {
      sinon.restore(); // Clean up all stubs
    });
  
    describe("GET /dashboard", () => {
      it("should render dashboard page for authenticated user", async () => {
        const response = await request(app)
          .get("/dashboard")
          .expect(200);
  
        console.log("Response text:", response.text); // Debug output
        expect(response.text).to.include("testuser"); // Check for username
        expect(response.text).to.include("Dashboard"); // Check for title
      });
  
      it("should return 401 if user is not authenticated", async () => {
        // Clear all previous stubs
        sinon.restore();
  
        // Set up a fresh Express app for this test
        const app = express(); // Use local scope to avoid interference
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
  
        // Clear module cache for auth and dashboard routes
        delete require.cache[require.resolve("../middleware/auth")];
        delete require.cache[require.resolve("../routes/dashboard")];
  
        // Stub ensureAuthenticated to return 401
        const authModule = require("../middleware/auth");
        sinon.stub(authModule, "ensureAuthenticated").callsFake((req, res, next) => {
          console.log("Stubbed ensureAuthenticated called - returning 401"); // Debug log
          return res.status(401).json({ success: false, message: "User not authenticated" });
        });
  
        // Require and mount dashboard routes after stubbing
        const dashboardRoutes = require("../routes/dashboard");
        app.use("/", dashboardRoutes);
  
        const response = await request(app)
          .get("/dashboard")
          .expect(401);
  
        expect(response.body.success).to.be.false;
        expect(response.body.message).to.equal("User not authenticated");
      });
    });
  });