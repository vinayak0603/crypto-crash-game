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
let currentRound = null;

function gameSocket(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 Player connected: ${socket.id}`);
    connectedUsers++;

    if (connectedUsers === 1 && !gameLoopActive) {
      console.log('🟢 First user joined. Starting game...');
      gameLoopActive = true;
      startNewRound(io);
    }

    socket.on('join_game', () => {
      socket.emit('welcome', { msg: 'Joined game' });
    });

    socket.on('place_bet', (data) => {
      if (!isRoundActive) {
        players.push({ socketId: socket.id, ...data, hasCashedOut: false });
        socket.emit('bet_placed', { success: true });
      } else {
        socket.emit('bet_placed', { success: false, msg: 'Round already started' });
      }
    });

    socket.on('cashout', async () => {
      const player = players.find(p => p.socketId === socket.id && !p.hasCashedOut);
    
      if (!player || !isRoundActive || currentMultiplier >= crashPoint) {
        socket.emit('cashout_failed', { msg: 'Too late or no active bet' });
        return;
      }
    
      player.hasCashedOut = true;
      const payout = player.cryptoAmount * currentMultiplier;
      const currency = player.cryptoType || 'BTC';
    
      try {
        const playerDoc = await Player.findOne({ playerId: player.playerId });
    
        if (!playerDoc) {
          throw new Error('Player not found in DB');
        }
    
        // ✅ Ensure wallet and currency field exist
        if (!playerDoc.wallet) playerDoc.wallet = {};
        if (!playerDoc.wallet[currency]) playerDoc.wallet[currency] = 0;
    
        playerDoc.wallet[currency] += payout;
        await playerDoc.save();
    
        if (currentRound) {
          currentRound.cashouts.push({
            playerId: player.playerId,
            payout,
            multiplier: currentMultiplier,
            currency,
            usdAmount: 0,
            timestamp: new Date()
          });
          await currentRound.save();
        }
    
        io.emit('player_cashout', {
          playerId: player.playerId,
          payout,
          currency,
          multiplier: currentMultiplier
        });
    
      } catch (err) {
        console.error('❌ Error during cashout:', err);
        socket.emit('cashout_failed', { msg: err.message || 'Server error' });
      }
    });
    

    socket.on('disconnect', () => {
      connectedUsers--;
      console.log(`❌ Player disconnected: ${socket.id}`);

      if (connectedUsers === 0 && gameLoopActive) {
        console.log('🛑 No players left. Stopping game.');
        gameLoopActive = false;
        isRoundActive = false;
        clearInterval(interval);
        players = [];
      }
    });
  });
}

async function startNewRound(io) {
  if (!gameLoopActive) return;

  console.log(`🚀 Starting round ${roundNumber}`);
  currentMultiplier = 1;
  isRoundActive = true;
  crashPoint = generateCrashPoint('secret-seed', roundNumber);

  currentRound = new GameRound({
    roundNumber,
    seed: 'secret-seed',
    crashPoint,
    bets: players,
    cashouts: [],
    startTime: new Date()
  });
  await currentRound.save();

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
  }, 100);
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
