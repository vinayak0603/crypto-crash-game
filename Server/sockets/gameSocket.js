const { generateCrashPoint } = require('../utils/fairCrash');
const GameRound = require('../models/GameRound');
const Player = require('../models/Player');

let roundNumber = 1;
let isRoundActive = false;
let currentMultiplier = 1;
let crashPoint = 0;
let interval = null;
let players = [];

function gameSocket(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 Player connected: ${socket.id}`);

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

      if (player && isRoundActive && currentMultiplier < crashPoint) {
        player.hasCashedOut = true;
        const payout = player.cryptoAmount * currentMultiplier;
        const currency = player.cryptoType || 'BTC';

        try {
          const playerDoc = await Player.findOne({ playerId: player.playerId });

          if (playerDoc) {
            if (!playerDoc.wallet) playerDoc.wallet = {};
            if (!playerDoc.wallet[currency]) playerDoc.wallet[currency] = 0;

            playerDoc.wallet[currency] += payout;
            await playerDoc.save();

            io.emit('player_cashout', {
              playerId: player.playerId,
              payout,
              currency,
              multiplier: currentMultiplier
            });

            console.log(`✅ ${player.playerId} cashed out ${payout} ${currency} at ${currentMultiplier.toFixed(2)}x`);
          } else {
            console.warn(`⚠️ Player ${player.playerId} not found`);
          }
        } catch (error) {
          console.error('❌ Error updating wallet:', error);
          socket.emit('cashout_failed', { msg: 'Server error during cashout' });
        }
      } else {
        socket.emit('cashout_failed', { msg: 'Too late or no active bet' });
      }
    });
  });

  // Start the first round shortly after server starts
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
  }, 100);
}

async function endRound(io) {
  console.log(`💥 Ending round ${roundNumber} at ${currentMultiplier.toFixed(2)}x`);
  isRoundActive = false;

  // ✅ Reset logic after 100 rounds
  if (roundNumber >= 100) {
    console.log('🧹 Reached 100 rounds — clearing history and restarting from round 1...');
    await GameRound.deleteMany({});
    roundNumber = 1;
  } else {
    roundNumber++;
  }

  players = [];

  io.emit('waiting', { msg: 'Next round starts in 10 seconds' });

  setTimeout(() => {
    startNewRound(io);
  }, 10000);
}

module.exports = gameSocket;
