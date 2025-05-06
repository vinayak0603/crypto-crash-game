import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';

export default function CrashGame() {
  const socket = useRef(null);

  const [multiplier, setMultiplier] = useState(1);
  const [crashPoint, setCrashPoint] = useState(null);
  const [round, setRound] = useState(null);
  const [status, setStatus] = useState('Waiting...');
  const [countdown, setCountdown] = useState(null);
  const [playerId] = useState('player1');
  const [betAmount, setBetAmount] = useState(10);
  const [crypto, setCrypto] = useState('BTC');
  const [hasCashedOut, setHasCashedOut] = useState(false);
  const [wallet, setWallet] = useState({ BTC: 0, ETH: 0 });
  const [usdWallet, setUsdWallet] = useState({ BTC: 0, ETH: 0 });
  const [roundActive, setRoundActive] = useState(false);

  const fetchWallet = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/wallet/${playerId}`);
      setWallet(res.data.crypto);
      setUsdWallet(res.data.usd);
    } catch (err) {
      console.error('Wallet fetch error', err);
      setStatus('⚠️ Wallet fetch failed');
    }
  };

  useEffect(() => {
    socket.current = io('http://localhost:5000');
    socket.current.emit('join_game');
    fetchWallet();

    let countdownInterval = null;

    socket.current.on('round_start', (data) => {
      setRound(data.roundNumber);
      setCrashPoint(parseFloat(data.crashPoint));
      setMultiplier(1);
      setStatus(`🚀 Round ${data.roundNumber} started!`);
      setHasCashedOut(false);
      setCountdown(null);
      setRoundActive(true);
    });

    socket.current.on('multiplier_update', (data) => {
      setMultiplier(parseFloat(data.multiplier));
    });

    socket.current.on('round_crash', (data) => {
      setStatus(`💥 Crashed at ${data.crashPoint}x`);
      setRoundActive(false);
    });

    socket.current.on('waiting', (data) => {
      setStatus(data.msg);
      setCountdown(10);

      if (countdownInterval) clearInterval(countdownInterval);

      countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev === 1) {
            clearInterval(countdownInterval);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    });

    socket.current.on('player_cashout', (data) => {
      if (data.playerId === playerId) {
        setStatus(`✅ Cashed out at ${data.multiplier.toFixed(2)}x`);
        setHasCashedOut(true);
        fetchWallet();
      }
    });

    socket.current.on('cashout_failed', (data) => {
      setStatus(`❌ Cashout failed: ${data.msg}`);
    });

    return () => {
      socket.current.disconnect();
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, [playerId]);

  const placeBet = async () => {
    if (roundActive) {
      setStatus('❌ Cannot bet after round has started');
      return;
    }

    try {
      const res = await axios.post('http://localhost:5000/api/bet', {
        playerId,
        usdAmount: parseFloat(betAmount),
        cryptoType: crypto,
      });

      if (res.data.success) {
        socket.current.emit('place_bet', {
          playerId,
          usdAmount: parseFloat(betAmount),
          cryptoAmount: res.data.cryptoAmount,
          cryptoType: crypto,
        });
        setStatus('🎯 Bet Placed!');
        fetchWallet();
      } else {
        setStatus(res.data.msg || '❌ Bet failed.');
      }
    } catch (err) {
      setStatus('❌ Network error.');
    }
  };

  const handleCashout = () => {
    if (!hasCashedOut && roundActive) {
      socket.current.emit('cashout');
      setHasCashedOut(true);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 min-h-screen bg-gray-900 text-white">
      <h1 className="text-4xl font-bold mb-6">Crypto Crash Game</h1>

      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md text-center shadow-lg">
        <p className="text-xl mb-2">Multiplier</p>
        <p className="text-6xl font-bold text-yellow-400 mb-4">{multiplier.toFixed(2)}x</p>
        <p className="text-sm text-gray-300 mb-4">
          Crash Point: {crashPoint ? crashPoint.toFixed(2) : '—'}x
        </p>

        <div className="flex gap-2 mb-4">
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            className="px-4 py-2 rounded text-black w-1/2"
            placeholder="USD"
            disabled={roundActive}
          />
          <select
            value={crypto}
            onChange={(e) => setCrypto(e.target.value)}
            className="px-4 py-2 rounded text-black w-1/2"
            disabled={roundActive}
          >
            <option value="BTC">BTC</option>
            <option value="ETH">ETH</option>
          </select>
        </div>

        <div className="flex gap-2 mb-4 justify-center">
          <button
            onClick={placeBet}
            disabled={roundActive}
            className={`${
              roundActive ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
            } px-6 py-2 rounded`}
          >
            Place Bet
          </button>
          <button
            onClick={handleCashout}
            className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded"
            disabled={!roundActive || hasCashedOut}
          >
            Cash Out
          </button>
        </div>

        <p className="text-yellow-300">
          {status} {countdown !== null && `(${countdown}s)`}
        </p>

        <div className="bg-gray-700 mt-6 p-4 rounded-xl">
          <h2 className="text-lg font-bold mb-2">Wallet</h2>
          <p className="text-sm">BTC: {wallet.BTC.toFixed(6)} (${usdWallet.BTC})</p>
          <p className="text-sm">ETH: {wallet.ETH.toFixed(6)} (${usdWallet.ETH})</p>
        </div>
      </div>
    </div>
  );
}
