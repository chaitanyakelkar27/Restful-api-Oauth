require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser'); // Add this for OAuth state cookies
const authRoutes = require('./routes/authRoutes');
const noteRoutes = require('./routes/noteRoutes');
const oauthGithub = require('./routes/oauthGithub'); // Add GitHub OAuth routes
const path = require('path');

const app = express();

app.use(helmet());
app.use(cors());
app.use(cookieParser()); // Add cookie parser middleware for OAuth state
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/notes', noteRoutes);
app.use('/', oauthGithub); // Mount GitHub OAuth routes at root level

// health
app.get('/health', (req, res) => res.json({ ok: true }));

// centralized error fallback
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Server Error', message: 'An unexpected error occurred' });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Mongo connected');
}).catch(err => {
  console.error('Mongo connection error', err);
  process.exit(1);
});

// Export the app (don't start the server here)
module.exports = app;