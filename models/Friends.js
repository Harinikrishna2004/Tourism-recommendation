const mongoose = require('mongoose');

const FriendSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  friend: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['Pending', 'Accepted', 'Blocked'], default: 'Pending' }
});

module.exports = mongoose.model('Friend', FriendSchema);
