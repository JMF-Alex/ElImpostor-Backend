require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const socketHandlers = require('./socket/handlers');

const app = express();

app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  if (origin && (origin.endsWith('.vercel.app') || origin.includes('localhost') || origin.includes('127.0.0.1'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      callback(null, origin || true);
    },
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
  allowEIO3: true,
  transports: ['polling', 'websocket']
});

socketHandlers(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
