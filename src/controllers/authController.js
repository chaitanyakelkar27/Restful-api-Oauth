const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const signAccessToken = (user) => {
  // short-lived access token
  return jwt.sign(
    { id: user._id.toString(), roles: user.roles },
    process.env.JWT_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRES || '15m' }
  );
};

const signRefreshToken = (user) => {
  // longer-lived refresh token
  return jwt.sign(
    { id: user._id.toString() },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES || '7d' }
  );
};

exports.register = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ success: false, error: 'Validation Error', message: 'email & password required' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ success: false, error: 'Conflict', message: 'Email already registered' });

    const user = new User({ email, password });
    await user.save();

    res.status(201).json({ success: true, message: 'User registered', userId: user._id });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, error: 'Server Error', message: 'Failed to register' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ success: false, error: 'Validation Error', message: 'email & password required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized', message: 'Invalid credentials' });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ success: false, error: 'Unauthorized', message: 'Invalid credentials' });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    // save refresh token for this user (for rotation/revoke)
    user.refreshTokens.push(refreshToken);
    // optional: keep only recent N tokens: user.refreshTokens = user.refreshTokens.slice(-5)
    await user.save();

    res.json({
      success: true,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: process.env.ACCESS_TOKEN_EXPIRES_SECONDS || 15 * 60
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Server Error', message: 'Failed to login' });
  }
};

exports.refresh = async (req, res) => {
  try {
    const { refresh_token } = req.body || {};
    if (!refresh_token) return res.status(400).json({ success: false, error: 'Validation Error', message: 'refresh_token required' });

    // verify refresh token signature
    let payload;
    try {
      payload = jwt.verify(refresh_token, process.env.REFRESH_TOKEN_SECRET);
    } catch (e) {
      return res.status(401).json({ success: false, error: 'Unauthorized', message: 'Invalid refresh token' });
    }

    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized', message: 'Invalid refresh token' });

    // check token is one we issued (prevent reuse after revoke)
    if (!user.refreshTokens.includes(refresh_token)) {
      return res.status(401).json({ success: false, error: 'Unauthorized', message: 'Refresh token revoked' });
    }

    // rotate refresh token: remove old, add new
    const newAccess = signAccessToken(user);
    const newRefresh = signRefreshToken(user);

    // replace old in DB
    user.refreshTokens = user.refreshTokens.filter(t => t !== refresh_token);
    user.refreshTokens.push(newRefresh);
    await user.save();

    res.json({
      success: true,
      access_token: newAccess,
      refresh_token: newRefresh,
      token_type: 'Bearer'
    });
  } catch (err) {
    console.error('Refresh token error:', err);
    res.status(500).json({ success: false, error: 'Server Error', message: 'Failed to refresh token' });
  }
};

exports.revoke = async (req, res) => {
  try {
    const { refresh_token } = req.body || {};
    if (!refresh_token) return res.status(400).json({ success: false, error: 'Validation Error', message: 'refresh_token required' });

    // decode (no throw)
    try {
      const payload = jwt.verify(refresh_token, process.env.REFRESH_TOKEN_SECRET);
      const user = await User.findById(payload.id);
      if (user) {
        user.refreshTokens = user.refreshTokens.filter(t => t !== refresh_token);
        await user.save();
      }
    } catch (e) {
      // invalid token - nothing to do, still return success to avoid token probing
    }

    res.json({ success: true, message: 'Refresh token revoked (if valid)' });
  } catch (err) {
    console.error('Revoke error:', err);
    res.status(500).json({ success: false, error: 'Server Error', message: 'Failed to revoke token' });
  }
};
