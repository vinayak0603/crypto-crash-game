
# 🧨 Crypto Crash Game

A real-time multiplayer crash game simulation using **WebSockets**, **MongoDB**, **React.js**, and **Node.js**. Users bet in crypto (BTC/ETH), watch the multiplier rise, and try to cash out before it crashes!

---

## 🚀 Features

- 🎲 Provably fair crash algorithm
- 🧠 Real-time multiplier updates via WebSocket
- 💸 USD-to-crypto conversion using real-time price APIs
- 📦 Full game round history stored in MongoDB
- 🔐 Cashout system with wallet updates
- 🧾 REST + WebSocket API
- 🌐 React + Tailwind frontend

---

## ⚙️ Setup Instructions

### 1. Clone the project

```bash
git clone https://github.com/vinayak0603/crypto-crash-game.git
cd crypto-crash-game
```

### 2. Install backend dependencies

```bash
cd server
npm install
```

### 3. Install frontend dependencies

```bash
cd  client
npm install
```



You can use MongoDB locally or a cloud provider like MongoDB Atlas.

```bash
mongod
```

### 4. Seed initial player data

```bash
cd server
node seed/seedData.js
```

### 5. Start backend server

```bash
npm start
```

### 6. Start frontend (React + Vite)

```bash
cd client
npm run dev
```

---

## 🔑 Crypto API Configuration

i have use **CoinGecko** for free crypto prices — no API key needed.

If you want to use a provider like CoinMarketCap or Binance:

- Replace the logic in `/services/cryptoPriceService.js`
- Add your API key using environment variables:
  ```env
  API_KEY=your_api_key
  ```

---

## 📡 API Endpoints

| Endpoint                         | Method | Description                        |
|----------------------------------|--------|------------------------------------|
| `/api/wallet/:playerId`         | GET    | Get wallet balance + USD values   |
| `/api/bet`                      | POST   | Place a bet (USD → BTC/ETH)       |

### 🔄 `POST /api/bet`

**Request:**
```json
{
  "playerId": "player1",
  "usdAmount": 10,
  "cryptoType": "BTC"
}
```

**Response:**
```json
{
  "success": true,
  "cryptoAmount": 0.000167
}
```

---

## 🔌 WebSocket Events

| Event Name       | Direction   | Payload                                         | Description                           |
|------------------|-------------|--------------------------------------------------|---------------------------------------|
| `join_game`      | client → server | `{}`                                          | Join the game                         |
| `round_start`    | server → client | `{ roundNumber, crashPoint }`                 | Starts a new round                    |
| `multiplier_update` | server → client | `{ multiplier }`                             | Live multiplier updates               |
| `round_crash`    | server → client | `{ crashPoint }`                              | Notifies crash                        |
| `waiting`        | server → client | `{ msg }`                                     | Notifies 10s delay before next round  |
| `place_bet`      | client → server | `{ playerId, usdAmount, cryptoAmount, cryptoType }` | Sends a bet                     |
| `cashout`        | client → server | `{}`                                          | Requests cashout                      |
| `player_cashout` | server → client | `{ playerId, payout, multiplier, currency }`  | Notifies successful cashout           |
| `cashout_failed` | server → client | `{ msg }`                                     | When cashout fails (too late, etc.)   |

---

## 🔐 Provably Fair Crash Algorithm

We use a provably fair crash generator:

```js
function generateCrashPoint(seed, roundNumber) {
  const hash = crypto.createHmac('sha256', seed).update(String(roundNumber)).digest('hex');
  const int = parseInt(hash.substring(0, 13), 16);
  return Math.max(1, Math.floor((1000000 / (int % 10000 + 1))) / 100);
}
```

### 🧮 How It Ensures Fairness:
- `seed` is consistent
- `roundNumber` is known
- Output is deterministic and verifiable
- No manipulation possible after round begins

---

## 💵 USD-to-Crypto Conversion Logic

Inside `/services/cryptoPriceService.js`, we:

1. Cache real-time BTC/ETH prices for 10 seconds using `node-cache`
2. Use [CoinGecko API](https://api.coingecko.com/api/v3/simple/price) to fetch live USD values
3. On bet:
   - Convert USD to crypto amount
4. On cashout:
   - Convert crypto payout to USD for logging

---

## 🧠 Game Logic Overview

- 🎮 **Game Loop:**  
  1. Starts a round → emits `round_start`  
  2. Updates `multiplier` every 100ms  
  3. At `crashPoint`, emits `round_crash`  
  4. Waits 10s → starts next round

- 💸 **Betting System:**  
  Players place bets in USD, converted to BTC/ETH  
  Bets are accepted **only before round starts**

- 💰 **Cashout System:**  
  Players can cash out at any multiplier  
  Their crypto wallet is updated immediately  
  USD equivalent is logged

- 🧾 **Round History Storage:**  
  All rounds are saved in MongoDB with:
  - Round number
  - Crash point
  - Player bets
  - Cashouts
  - USD and crypto amounts

---

## 📁 Folder Structure

```
.
├── server
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── sockets/
│   ├── utils/
│   └── server.js
├── client
│   └── src/
```

---

## 🧑‍💻 Author

Created with ❤️ by [Vinayak Andhere]  
Feel free to fork, contribute, or contact!

