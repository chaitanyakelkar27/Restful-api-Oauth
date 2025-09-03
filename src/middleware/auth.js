const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized', message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // payload should contain user id and roles from login
    req.user = {
      id: payload.id,
      roles: payload.roles || []
    };
    return next();
  } catch (err) {
    console.error('Auth middleware token error:', err);
    return res.status(401).json({ success: false, error: 'Unauthorized', message: 'Invalid or expired token' });
  }
};
