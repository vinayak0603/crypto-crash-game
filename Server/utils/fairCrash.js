// utils/fairCrash.js
const crypto = require('crypto');

function generateCrashPoint(seed, round) {
  const hash = crypto.createHash('sha256').update(seed + round).digest('hex');
  const num = parseInt(hash.substring(0, 8), 16);
  const crash = 1 + (num % 10000) / 1000;
  return parseFloat(crash.toFixed(2));
}

module.exports = { generateCrashPoint };
