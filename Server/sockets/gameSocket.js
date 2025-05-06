const { generateCrashPoint } = require('../utils/fairCrash');
const GameRound = require('../models/GameRound');
const Player = require('../models/Player');

let roundNumber = 1;
let isRoundActive = false;
let currentMultiplier = 1;
let crashPoint = 0;
let interval = null;
let players = [];
let connectedUsers = 0;
let gameLoopActive = false;


function gameSocket(io) {
  io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);
    connectedUsers++;
  
    if (connectedUsers === 1 && !gameLoopActive) {
      console.log("🟢 First user joined — starting game loop");
      gameLoopActive = true;
      startNewRound(io);
    }
  
    socket.on('disconnect', () => {
      connectedUsers--;
      console.log(`Player disconnected: ${socket.id}`);
      
      if (connectedUsers === 0 && gameLoopActive) {
        console.log("🔴 No users left — stopping game loop");
        gameLoopActive = false;
        clearInterval(interval); // stop multiplier update
        isRoundActive = false;
        players = [];
      }
    });
  
    // existing place_bet, cashout handlers here...
  });
  

  // ✅ Start the first round after server starts
  setTimeout(() => {
    startNewRound(io);
  }, 1000);
}

async function startNewRound(io) {
  console.log(`🚀 Starting round ${roundNumber}`);
  currentMultiplier = 1;
  isRoundActive = true;
  crashPoint = generateCrashPoint('secret-seed', roundNumber);

  const round = new GameRound({
    roundNumber,
    seed: 'secret-seed',
    crashPoint,
    bets: players,
    startTime: new Date()
  });
  await round.save();

  io.emit('round_start', { roundNumber, crashPoint });

  interval = setInterval(() => {
    currentMultiplier += 0.05;
    io.emit('multiplier_update', {
      multiplier: currentMultiplier.toFixed(2)
    });

    if (currentMultiplier >= crashPoint) {
      clearInterval(interval);
      io.emit('round_crash', { crashPoint: crashPoint.toFixed(2) });
      endRound(io);
    }
  }, 100); // update every 100ms
}

async function endRound(io) {
  if (!gameLoopActive) return;

  console.log(`💥 Ending round ${roundNumber} at ${currentMultiplier.toFixed(2)}x`);
  isRoundActive = false;
  roundNumber++;
  players = [];

  if (currentRound) {
    currentRound.endTime = new Date();
    await currentRound.save();
    currentRound = null;
  }

  io.emit('waiting', { msg: 'Next round starts in 10 seconds' });

  setTimeout(() => {
    if (gameLoopActive) {
      startNewRound(io);
    }
  }, 10000);
}

module.exports = gameSocket;

