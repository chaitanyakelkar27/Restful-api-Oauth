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
        console.log('GitHub user response:', ghUser);

        // Sometimes email is not public - fetch emails
        let email = ghUser.email;
        if (!email) {
            try {
                const emailsResp = await axios.get('https://api.github.com/user/emails', {
                    headers: {
                        Authorization: `token ${githubAccessToken}`,
                        Accept: 'application/vnd.github+json'
                    }
                });
                const emails = emailsResp.data || [];
                const primary = emails.find(e => e.primary) || emails[0];
                email = primary && primary.email;
                console.log('Fetched email from API:', email);
            } catch (emailError) {
                console.error('Error fetching emails:', emailError.message);
            }
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

        // Include GitHub user profile data in the redirect
        const userData = {
            id: ghUser.id,
            name: ghUser.name || null,
            login: ghUser.login || null,
            email: email || null,
            location: ghUser.location || null,
            company: ghUser.company || null,
            blog: ghUser.blog || null,
            bio: ghUser.bio || null,
            public_repos: ghUser.public_repos || 0,
            followers: ghUser.followers || 0,
            following: ghUser.following || 0,
            avatar_url: ghUser.avatar_url || null,
            html_url: ghUser.html_url || null,
            created_at: ghUser.created_at || null,
            updated_at: ghUser.updated_at || null,
            userId: user._id
        };
        
        console.log('Prepared user data for redirect:', userData);
        
        // Encode the user data to pass in URL
        const encodedUserData = encodeURIComponent(JSON.stringify(userData));
        console.log('Encoded user data length:', encodedUserData.length);
        
        // Create the redirect URL
        const redirectUrl = `/success.html?access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}&user_data=${encodedUserData}`;
        console.log('Redirect URL:', redirectUrl);
        
        // Redirect to our new success page with tokens and user data
        return res.redirect(redirectUrl);
    } catch (err) {
        console.error('GitHub OAuth callback error', err.response?.data || err.message || err);
        return res.redirect('/?error=Authentication%20failed');
    }
});

module.exports = router;