const express = require("express");
const router = express.Router();
const Reservation = require("../models/Reservation");

// Middleware to ensure the user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    res.status(401).json({ error: "Unauthorized" });
};

// Serve the reservations page with server-side rendering
router.get("/reservations", isAuthenticated, async (req, res) => {
    try {
        const username = req.session.user.username;
        const reservations = await Reservation.find({ username })
            .populate("destination_id", "name")
            .populate("booking_id")
            .lean();
        console.log("Reservations for rendering:", JSON.stringify(reservations, null, 2));
        res.render("reservations", { reservations, title: "My Reservations" });
    } catch (error) {
        console.error("Error fetching reservations:", error);
        res.render("reservations", { reservations: [], error: "Server error", title: "My Reservations" });
    }
});

// Serve dashboard page with server-side rendering
router.get("/", isAuthenticated, async (req, res) => {
    const Destination = require("../models/Destination");
    try {
        const destinations = await Destination.find().lean();
        res.render("dashboard", { filteredDestinations: destinations, title: "Dashboard" });
    } catch (error) {
        console.error("Error fetching destinations:", error);
        res.render("dashboard", { filteredDestinations: [], error: "Server error", title: "Dashboard" });
    }
});

// GET endpoint to fetch reservations for the logged-in user
router.get("/user-reservations", isAuthenticated, async (req, res) => {
    try {
        const username = req.session.user.username;
        console.log("Fetching reservations for user:", username);
        const reservations = await Reservation.find({ username })
            .populate("destination_id", "name")
            .populate("booking_id")
            .lean();
        console.log("Reservations fetched:", JSON.stringify(reservations, null, 2));
        res.json(reservations);
    } catch (error) {
        console.error("Error fetching reservations:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// PUT endpoint to update the visit date of a reservation
router.put("/api/reservations/update-date/:reservationId", isAuthenticated, async (req, res) => {
    try {
        const { reservationId } = req.params;
        const { visit_date } = req.body;
        const username = req.session.user.username;

        console.log(`PUT request received for reservation ${reservationId} by user ${username} with new date: ${visit_date}`);

        if (!visit_date) {
            return res.status(400).json({ error: "Visit date is required" });
        }

        const reservation = await Reservation.findOneAndUpdate(
            { _id: reservationId, username },
            { visit_date: new Date(visit_date) },
            { new: true }
        );

        if (!reservation) {
            return res.status(404).json({ error: "Reservation not found" });
        }

        console.log("Updated reservation:", reservation);
        res.json({ success: true, reservation });
    } catch (error) {
        console.error("Error updating reservation:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// Add this new DELETE endpoint after the PUT endpoint
router.delete("/api/reservations/cancel/:reservationId", isAuthenticated, async (req, res) => {
    console.log("DELETE endpoint reached:", req.params.reservationId);
    try {
        const { reservationId } = req.params;
        const username = req.session.user.username;

        console.log(`DELETE request received for reservation ${reservationId} by user ${username}`);

        const reservation = await Reservation.findOneAndDelete({
            _id: reservationId,
            username
        });

        if (!reservation) {
            return res.status(404).json({ error: "Reservation not found" });
        }

        console.log("Cancelled reservation:", reservation);
        res.json({ success: true, message: "Reservation cancelled successfully" });
    } catch (error) {
        console.error("Error cancelling reservation:", error);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;