const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  username: { type: String, ref: 'User', required: true },
  destination_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination', required: true },
  visit_date: { type: Date, required: true },
  amount_paid: { type: Number, required: true },
  hotel_price: { type: Number, default: 0 },
  flight_price: { type: Number, default: 0 },
  payment_status: { type: String, default: 'Pending' }
});

module.exports = mongoose.model('Booking', bookingSchema);