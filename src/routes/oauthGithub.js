// src/routes/oauthGithub.js
const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const User = require('../models/User'); // your User model
const { signAccessToken, signRefreshToken } = require('../controllers/authController'); // your functions
const router = express.Router();

router.get('/auth/github', (req, res) => {
    const state = crypto.randomBytes(16).toString('hex');
    // store state (in session, in DB, or as secure httpOnly cookie). Example uses cookie:
    res.cookie('oauth_state', state, { httpOnly: true, sameSite: 'lax' });

    const params = new URLSearchParams({
        client_id: process.env.GITHUB_CLIENT_ID,
        redirect_uri: process.env.GITHUB_CALLBACK_URL,
        scope: 'read:user user:email', // adjust scopes you need
        state
        // optionally: code_challenge and code_challenge_method=S256 for PKCE
    });

    res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
});

router.get('/auth/github/callback', async (req, res) => {
    const { code, state } = req.query;
    const savedState = req.cookies && req.cookies.oauth_state;
    if (!state || state !== savedState) {
        return res.status(400).send('Invalid state');
    }

    try {
        // Exchange code for access_token (server-to-server)
        const tokenResp = await axios.post('https://github.com/login/oauth/access_token', {
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code,
            redirect_uri: process.env.GITHUB_CALLBACK_URL,
            state
        }, {
            headers: { Accept: 'application/json' } // GitHub returns JSON when this header present
        });

        const { access_token: githubAccessToken } = tokenResp.data;
        if (!githubAccessToken) return res.status(400).send('No GitHub access token received');

        // Get user profile
        const userResp = await axios.get('https://api.github.com/user', {
            headers: {
                Authorization: `token ${githubAccessToken}`,
                Accept: 'application/vnd.github+json'
            }
        });
        const ghUser = userResp.data;

        // Sometimes email is not public - fetch emails
        let email = ghUser.email;
        if (!email) {
            const emailsResp = await axios.get('https://api.github.com/user/emails', {
                headers: {
                    Authorization: `token ${githubAccessToken}`,
                    Accept: 'application/vnd.github+json'
                }
            });
            const emails = emailsResp.data || [];
            const primary = emails.find(e => e.primary) || emails[0];
            email = primary && primary.email;
        }

        // Find or create local user
        let user = await User.findOne({ email });
        if (!user) {
            user = new User({ email, password: crypto.randomBytes(16).toString('hex') });
            await user.save();
        }

        // Issue your own JWT + refresh token (so your resource server trusts it)
        const accessToken = signAccessToken(user);   // use your earlier signAccessToken implementation
        const refreshToken = signRefreshToken(user);

        // Save refresh token to user.refreshTokens... (as in your authController)
        user.refreshTokens.push(refreshToken);
        await user.save();

        // return tokens to client or set cookie + redirect to frontend
        // Example: redirect to frontend with tokens in query (not recommended for prod).
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/success?access_token=${accessToken}&refresh_token=${refreshToken}`);
    } catch (err) {
        console.error('GitHub OAuth callback error', err.response?.data || err.message || err);
        return res.status(500).send('GitHub OAuth failed');
    }
});

module.exports = router;