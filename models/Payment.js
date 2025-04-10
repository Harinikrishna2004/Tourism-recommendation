const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  booking_id: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
  username: { type: String, required: true },
  payment_method: { type: String, enum: ["Credit Card", "PayPal"], required: true },
  transaction_id: { type: String, unique: true, required: true },
  payment_status: { type: String, enum: ["Pending", "Completed", "Failed"], default: "Pending" },
  amount: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Payment", paymentSchema);
