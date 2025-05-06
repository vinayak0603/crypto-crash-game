// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const gameSocket = require('./sockets/gameSocket');
// in server.js
const gameRoutes = require('./routes/gameRoutes');


const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const cors = require('cors');

// ✅ Allow requests from frontend
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());
app.use('/api', gameRoutes);
// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true, useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'));

// Routes
app.get('/', (req, res) => res.send('Crypto Crash Game Running'));

// WebSocket
gameSocket(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
