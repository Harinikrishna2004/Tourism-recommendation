const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema({
  username: { type: String, required: true },
  booking_id: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
  destination_id: { type: mongoose.Schema.Types.ObjectId, ref: "Destination", required: true },
  visit_date: { type: Date, required: true },
  payment_id: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", required: true },
}, { timestamps: true });

module.exports = mongoose.model("Reservation", reservationSchema);