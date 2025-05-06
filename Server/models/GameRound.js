// models/GameRound.js
const mongoose = require('mongoose');

const betSchema = new mongoose.Schema({
  playerId: String,
  usdAmount: Number,
  cryptoAmount: Number,
  cryptoType: String,
  multiplierAtCashout: Number,
  hasCashedOut: { type: Boolean, default: false },
  transactionHash: String
});

const gameRoundSchema = new mongoose.Schema({
  roundNumber: Number,
  seed: String,
  crashPoint: Number,
  bets: [betSchema],
  startTime: Date,
  endTime: Date
});

module.exports = mongoose.model('GameRound', gameRoundSchema);
