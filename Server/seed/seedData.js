const mongoose = require('mongoose');
const Player = require('../models/Player');

mongoose.connect('mongodb+srv://vinayakandhere4:niUjtjP7piNusVwA@cluster0.vtovevf.mongodb.net/crypto-crash?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const seedPlayers = async () => {
  await Player.deleteMany({});

  const players = [
    {
      playerId: 'player1',
      wallet: { BTC: 0.01, ETH: 0.5 }
    },
    {
      playerId: 'player2',
      wallet: { BTC: 0.02, ETH: 0.1 }
    },
    {
      playerId: 'player3',
      wallet: { BTC: 0.005, ETH: 1.0 }
    }
  ];

  await Player.insertMany(players);
  console.log('Seeded players');
  mongoose.disconnect();
};

seedPlayers();
