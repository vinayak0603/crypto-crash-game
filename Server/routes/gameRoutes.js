// routes/gameRoutes.js
const express = require('express');
const router = express.Router();
const Player = require('../models/Player');
const { getPrice } = require('../services/cryptoPriceService');
const { v4: uuidv4 } = require('uuid');

router.get('/wallet/:playerId', async (req, res) => {
  try {
    const player = await Player.findOne({ playerId: req.params.playerId });
    if (!player) return res.status(404).send({ error: 'Player not found' });

    const btcPrice = await getPrice('bitcoin');
    const ethPrice = await getPrice('ethereum');

    const usdBalance = {
      BTC: (player.wallet.BTC * btcPrice).toFixed(2),
      ETH: (player.wallet.ETH * ethPrice).toFixed(2)
    };

    res.send({ crypto: player.wallet, usd: usdBalance });
  } catch (error) {
    console.error('[WALLET ROUTE ERROR]', error.message);
    res.status(500).send({ error: 'Something went wrong with wallet lookup.' });
  }
});


router.post('/bet', async (req, res) => {
  const { playerId, usdAmount, cryptoType } = req.body;
  const player = await Player.findOne({ playerId });
  if (!player) return res.status(404).send({ error: 'Player not found' });

  const price = await getPrice(cryptoType === 'BTC' ? 'bitcoin' : 'ethereum');
  const cryptoAmount = usdAmount / price;

  if (player.wallet[cryptoType] < cryptoAmount)
    return res.status(400).send({ error: 'Insufficient balance' });

  // Deduct from wallet
  player.wallet[cryptoType] -= cryptoAmount;
  await player.save();

  // Return transaction
  const transaction = {
    transactionHash: uuidv4(),
    cryptoAmount,
    usdAmount,
    currency: cryptoType,
    priceAtTime: price,
    timestamp: new Date()
  };

  res.send({ success: true, ...transaction });
});

// Add to routes/gameRoutes.js

router.post('/cashout', async (req, res) => {
  const {
    playerId,
    roundNumber,
    multiplierAtCashout,
    cryptoType,
    initialCryptoAmount
  } = req.body;

  const payout = initialCryptoAmount * multiplierAtCashout;
  const price = await getPrice(cryptoType === 'BTC' ? 'bitcoin' : 'ethereum');
  const usdEquivalent = payout * price;

  const player = await Player.findOne({ playerId });
  if (!player) return res.status(404).send({ error: 'Player not found' });

  // Atomic update
  player.wallet[cryptoType] += payout;
  await player.save();

  const transaction = {
    transactionHash: uuidv4(),
    playerId,
    usdAmount: usdEquivalent,
    cryptoAmount: payout,
    currency: cryptoType,
    transactionType: 'cashout',
    priceAtTime: price,
    timestamp: new Date()
  };

  res.send({ success: true, transaction });
});


module.exports = router;
