const express = require('express');
const passport = require('passport');
const router = express.Router();
const { register, login, refresh, revoke } = require('../controllers/authController');

// Local Auth (already implemented)
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);   // exchange refresh token for new access
router.post('/revoke', revoke);     // revoke refresh token

// --- GitHub OAuth2 ---
// Step 1: Redirect to GitHub for login
router.get('/github',
    passport.authenticate('github', { scope: ['user:email'] })
);

// Step 2: GitHub redirects back to callback URL
router.get(
    '/github/callback',
    passport.authenticate('github', { failureRedirect: '/login' }),
    (req, res) => {
        // At this point, GitHub auth was successful
        // You can issue a JWT for your API here
        const user = req.user;

        // Example: respond with JWT instead of redirect
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            success: true,
            message: "GitHub login successful",
            token,
            user
        });
    }
);

module.exports = router;
