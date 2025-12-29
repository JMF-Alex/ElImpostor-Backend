require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const socketHandlers = require('./socket/handlers');

const allowedOrigins = [
  'https://jmf-el-impostor.vercel.app',
  'https://jmf-el-impostor-jmf-alexs-projects.vercel.app',
  'http://localhost:3001',
  'http://localhost:3000'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    const isVercel = origin.endsWith('.vercel.app');
    const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
    const isExplicitlyAllowed = allowedOrigins.includes(origin);
    
    if (isVercel || isLocalhost || isExplicitlyAllowed) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked for origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

const app = express();
app.use(cors(corsOptions));

const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions,
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
  allowEIO3: true,
  transports: ['websocket', 'polling']
});

socketHandlers(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
