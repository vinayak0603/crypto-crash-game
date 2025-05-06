// models/Player.js
const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  BTC: { type: Number, default: 0 },
  ETH: { type: Number, default: 0 }
});

const playerSchema = new mongoose.Schema({
  playerId: { type: String, required: true, unique: true },
  wallet: walletSchema,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Player', playerSchema);
