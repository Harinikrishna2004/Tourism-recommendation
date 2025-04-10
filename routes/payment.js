const express = require("express");
const router = express.Router();
const Payment = require("../models/Payment");
const Booking = require("../models/Booking");
const VisitedPlaces = require("../models/visited"); // Add this import
const Reservation = require("../models/Reservation"); // Add this line
const PDFDocument = require('pdfkit');
const fs = require('fs');
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL, // Your email
    pass: process.env.EMAIL_PASSWORD, // Your email password
  },
});

// ✅ GET Payment Page (Renders Payment Form)
router.get("/", async (req, res) => {
    try {
        const { booking_id } = req.query;
        if (!booking_id) {
            return res.status(400).send("Booking ID is required.");
        }

        const booking = await Booking.findById(booking_id).populate("destination_id");
        if (!booking) {
            return res.status(404).send("Booking not found.");
        }

        res.render("payment", { booking, destination: booking.destination_id });
    } catch (error) {
        console.error("Error loading payment page:", error);
        res.status(500).send("Internal Server Error.");
    }
});

const { ensureAuthenticated } = require("../middleware/auth");

// ✅ POST Complete Payment
router.post("/complete", ensureAuthenticated, async (req, res) => {
    try {
        console.log("📥 Received payment request:", req.body);

        const { booking_id, amount, username, payment_method } = req.body;

        if (!booking_id || !amount || !username || !payment_method) {
            console.error("❌ Missing required fields:", { booking_id, amount, username, payment_method });
            return res.status(400).json({ success: false, message: "Missing required fields." });
        }

        const booking = await Booking.findById(booking_id).populate("destination_id");
        if (!booking) {
            console.error("❌ Booking not found for ID:", booking_id);
            return res.status(404).json({ success: false, message: "Booking not found." });
        }

        booking.username = username;
        booking.payment_status = "Completed";
        await booking.save();

        const transaction_id = `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

        const newPayment = new Payment({
            booking_id,
            username,
            payment_method,
            transaction_id,
            payment_status: "Completed",
            amount
        });

        await newPayment.save();

        const destinationName = booking.destination_id.name;
        let visitedPlaces = await VisitedPlaces.findOne({ username });

        if (!visitedPlaces) {
            // Create a new document if it doesn’t exist
            visitedPlaces = new VisitedPlaces({
                username,
                visited: [destinationName]
            });
            await visitedPlaces.save();
            console.log("✅ Created new VisitedPlaces entry:", visitedPlaces);
        } else {
            // Update existing document, avoid duplicates
            if (!visitedPlaces.visited.includes(destinationName)) {
                visitedPlaces.visited.push(destinationName);
                await visitedPlaces.save();
                console.log("✅ Updated VisitedPlaces with:", destinationName);
            } else {
                console.log("ℹ Destination already in VisitedPlaces:", destinationName);
            }
        }
        let reservation = await Reservation.findOne({ booking_id });
        console.log("Existing reservation:", reservation);
        if (!reservation) {
            reservation = new Reservation({
                username,
                booking_id,
                destination_id: booking.destination_id._id,
                visit_date: booking.visit_date,
                payment_id: newPayment._id
            });
            await reservation.save();
            console.log("✅ Created new Reservation:", reservation);
        } else {
            // Update existing reservation if needed (e.g., payment_id)
            reservation.payment_id = newPayment._id;
            reservation.visit_date = booking.visit_date; // Ensure it’s up-to-date
            await reservation.save();
            console.log("✅ Updated existing Reservation:", reservation);
        }
        // Send Email Notification
        const mailOptions = {
            from: process.env.EMAIL, // Use env variable
            to: 'user-email@example.com', // Replace with dynamic user email later
            subject: 'Payment Confirmation',
            html: `
                <h2>Payment Successful!</h2>
                <p>Dear ${username},</p>
                <p>Your payment has been successfully processed. Here are the details:</p>
                <ul>
                    <li><strong>Transaction ID:</strong> ${transaction_id}</li>
                    <li><strong>Booking ID:</strong> ${booking_id}</li>
                    <li><strong>Destination:</strong> ${booking.destination_id.name}</li>
                    <li><strong>Visit Date:</strong> ${booking.visit_date.toDateString()}</li>
                    <li><strong>Hotel Price:</strong> ₹${booking.hotel_price}</li>
                    <li><strong>Flight Price:</strong> ₹${booking.flight_price}</li>
                    <li><strong>Total Amount:</strong> ₹${amount}</li>
                    <li><strong>Payment Method:</strong> ${payment_method}</li>
                    <li><strong>Date:</strong> ${newPayment.timestamp.toDateString()}</li>
                </ul>
                <p>Thank you for booking with us!</p>
            `
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Email sending error:", error);
            } else {
                console.log("Email sent:", info.response);
            }
        });

        console.log("✅ Payment successful:", newPayment);

        res.json({
            success: true,
            redirectUrl: `/payment/payment-success?transactionId=${transaction_id}&booking_id=${booking_id}&username=${username}&destination=${encodeURIComponent(booking.destination_id.name)}&visitDate=${booking.visit_date.toISOString().split('T')[0]}&hotelPrice=${booking.hotel_price}&flightPrice=${booking.flight_price}&totalAmount=${amount}&paymentMethod=${payment_method}&date=${newPayment.timestamp.toISOString().split('T')[0]}`
        });

    } catch (error) {
        console.error("🔥 Error processing payment:", error);
        res.status(500).json({ success: false, message: "Internal server error. Check logs." });
    }
});

// ✅ GET Payment Success Page
router.get("/payment-success", ensureAuthenticated, async (req, res) => {
    try {
        const { transactionId, booking_id, username, destination, visitDate, hotelPrice, flightPrice, totalAmount, paymentMethod, date } = req.query;

        if (!transactionId || !booking_id) {
            console.error("❌ Missing required parameters:", { transactionId, booking_id });
            return res.status(400).send("Missing required parameters.");
        }

        const payment = await Payment.findOne({ transaction_id: transactionId });
        if (!payment) {
            console.error("❌ Payment record not found for transaction ID:", transactionId);
            return res.status(404).send("Payment record not found.");
        }

        const booking = await Booking.findById(booking_id).populate("destination_id");
        if (!booking) {
            console.error("❌ Booking not found for ID:", booking_id);
            return res.status(404).send("Booking not found.");
        }

        res.render("payment-success", {
            username: username || booking.username || "Guest",
            transactionId,
            bookingId: booking._id,
            destination: destination || booking.destination_id.name,
            visitDate: visitDate || booking.visit_date.toDateString(),
            hotelPrice: hotelPrice || booking.hotel_price || 0,
            flightPrice: flightPrice || booking.flight_price || 0,
            totalAmount: totalAmount || payment.amount,
            paymentMethod: paymentMethod || payment.payment_method,
            date: date || payment.timestamp.toDateString()
        });

    } catch (error) {
        console.error("🔥 Error processing payment success page:", error);
        res.status(500).send("Internal server error.");
    }
});

// ✅ POST Download PDF
router.post("/download-pdf", ensureAuthenticated, async (req, res) => {
    try {
        const { transactionId, booking_id, username, destination, visitDate, hotelPrice, flightPrice, totalAmount, paymentMethod, date } = req.body;

        const booking = await Booking.findById(booking_id).populate("destination_id");
        const payment = await Payment.findOne({ transaction_id: transactionId });

        if (!booking || !payment) {
            return res.status(404).send("Booking or Payment not found.");
        }

        const doc = new PDFDocument();
        res.setHeader('Content-disposition', 'attachment; filename=booking-details.pdf');
        res.setHeader('Content-type', 'application/pdf');

        doc.pipe(res);

        doc.fontSize(20).text('Booking Confirmation', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Username: ${username || booking.username}`);
        doc.text(`Transaction ID: ${transactionId}`);
        doc.text(`Payment Date: ${date || payment.timestamp.toDateString()}`);
        doc.moveDown();
        doc.text(`Booking ID: ${booking_id}`);
        doc.text(`Destination: ${destination || booking.destination_id.name}`);
        doc.text(`Visit Date: ${visitDate || booking.visit_date.toDateString()}`);
        doc.moveDown();
        doc.text(`Hotel Price: ₹${hotelPrice || booking.hotel_price}`);
        doc.text(`Flight Price: ₹${flightPrice || booking.flight_price}`);
        doc.text(`Total Amount: ₹${totalAmount || payment.amount}`);
        doc.text(`Payment Method: ${paymentMethod || payment.payment_method}`);

        doc.end();

    } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).send("Error generating PDF.");
    }
});

// ✅ GET Payment History
router.get("/history", ensureAuthenticated, async (req, res) => {
    try {
        const username = req.user.username; // Get the logged-in user's username
        if (!username) {
            return res.status(401).send("User not authenticated.");
        }

        // Fetch all payments for this user, populate booking details
        const payments = await Payment.find({ username })
            .populate({
                path: 'booking_id',
                populate: { path: 'destination_id' } // Populate destination details within booking
            })
            .sort({ timestamp: -1 }); // Sort by latest first

        if (!payments || payments.length === 0) {
            return res.render("payment-history", { payments: [], username });
        }

        res.render("payment-history", { payments, username });

    } catch (error) {
        console.error("🔥 Error fetching payment history:", error);
        res.status(500).send("Internal server error.");
    }
});

module.exports = router;