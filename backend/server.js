require('dotenv').config();
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const { authMiddleware, JWT_SECRET } = require('./middleware/auth');

const authRouter = require('./routes/auth');
const locationsRouter = require('./routes/locations');
const tripsRouter = require('./routes/trips');
const officesRouter = require('./routes/offices');
const vehiclesRouter = require('./routes/vehicles');
const geofenceEventsRouter = require('./routes/geofenceEvents');
const simulatorRouter = require('./routes/simulator');
const demoRouter = require('./routes/demo');

const app = express();
const server = http.createServer(app);

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
const io = new Server(server, {
  cors: { origin: corsOrigin },
  pingTimeout: 60000,
  pingInterval: 25000
});

app.set('io', io);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '500kb' }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Too many requests' }
});
app.use('/api/', apiLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts' }
});

app.use('/api/auth', authLimiter);
app.use('/api/auth', authRouter);

app.use('/api/locations', authMiddleware, locationsRouter);
app.use('/api/trips', authMiddleware, tripsRouter);
app.use('/api/offices', authMiddleware, officesRouter);
app.use('/api/vehicles', authMiddleware, vehiclesRouter);
app.use('/api/geofence-events', authMiddleware, geofenceEventsRouter);
app.use('/api/simulator', authMiddleware, simulatorRouter);
app.use('/api/demo', authMiddleware, demoRouter);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
  if (!token) return next();
  const jwt = require('jsonwebtoken');
  const User = require('./models/User');
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return next();
    User.findById(decoded.userId).then((user) => {
      if (user && user.isActive) socket.user = user;
      next();
    }).catch(() => next());
  });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id, socket.user ? socket.user.email : 'anonymous');
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

connectDB().then(() => {
  const PORT = parseInt(process.env.PORT, 10) || 5001;
  server.listen(PORT, () => {
    console.log(`Moveinsync Vehicle Tracking API + Socket running on port ${PORT}`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Free it with: lsof -ti:${PORT} | xargs kill -9`);
      process.exit(1);
    }
    console.error('Server error:', err.message);
    process.exit(1);
  });
}).catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

module.exports = { app, server, io };
