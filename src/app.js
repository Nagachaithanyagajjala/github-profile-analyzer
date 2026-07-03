const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const profileRoutes = require('./routes/profileRoutes');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

const app = express();

// --- Global middleware ---
// CSP relaxed slightly to allow the bundled UI's Google Fonts + inline script/style.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https://avatars.githubusercontent.com'],
        connectSrc: ["'self'"],
      },
    },
  })
);
app.use(cors());
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// --- Static UI (public/index.html: search box, analyze button, results view) ---
app.use(express.static(path.join(__dirname, '..', 'public')));

const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

// --- Health check ---
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Service is healthy.', timestamp: new Date() });
});

// --- API routes ---
// GET / is served by the static UI (public/index.html) registered above.
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'GitHub Profile Analyzer API',
    endpoints: {
      analyze: 'POST /api/profiles/analyze/:username',
      list: 'GET /api/profiles',
      getOne: 'GET /api/profiles/:username',
      delete: 'DELETE /api/profiles/:username',
      health: 'GET /health',
    },
  });
});

app.use('/api/profiles', profileRoutes);

// --- 404 + error handling (must be last) ---
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
