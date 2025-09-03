// Global variables to store tokens and user data
let accessToken = '';
let refreshToken = '';
let userData = {};

// Helper: show toast notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#16a34a' : type === 'error' ? '#dc2626' : '#3b82f6'};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    z-index: 1000;
    animation: slideIn 0.3s ease;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Helper: parse JWT payload safely
function parseJWT(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error parsing JWT:', error);
    return null;
  }
}

// Helper: copy tokens to clipboard
function copyToClipboard(tokenType) {
  let textToCopy = '';
  if (tokenType === 'accessToken') textToCopy = accessToken;
  if (tokenType === 'refreshToken') textToCopy = refreshToken;
  if (!textToCopy) return;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => showNotification('Token copied to clipboard!', 'success'))
      .catch((err) => {
        console.error('Failed to copy: ', err);
        showNotification('Failed to copy token', 'error');
      });
  } else {
    const ta = document.createElement('textarea');
    ta.value = textToCopy;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showNotification('Token copied to clipboard!', 'success');
    } catch (e) {
      showNotification('Failed to copy token', 'error');
    }
    document.body.removeChild(ta);
  }
}

// Update all UI elements with data
function updateUI() {
  const now = new Date();

  const generatedTimeEl = document.getElementById('generatedTime');
  if (generatedTimeEl) generatedTimeEl.textContent = now.toLocaleString();

  const sessionTimeEl = document.getElementById('sessionTime');
  if (sessionTimeEl) sessionTimeEl.textContent = now.toLocaleTimeString();

  // Parse and display token information
  if (accessToken) {
    const tokenData = parseJWT(accessToken);
    if (tokenData) {
      const issuedAt = new Date(tokenData.iat * 1000);
      const expiresAt = new Date(tokenData.exp * 1000);
      const map = {
        issuedAt: issuedAt.toLocaleString(),
        expiresAt: expiresAt.toLocaleString(),
        userId: tokenData.id || tokenData.sub || 'N/A',
      };
      Object.entries(map).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
      });
    }

    // Display access token & add copy button
    const accessTokenDisplay = document.getElementById('accessTokenDisplay');
    if (accessTokenDisplay) {
      accessTokenDisplay.textContent = accessToken;
      const btn = document.createElement('button');
      btn.className = 'copy-button';
      btn.textContent = 'Copy';
      btn.dataset.tokenType = 'accessToken';
      btn.addEventListener('click', () => copyToClipboard('accessToken'));
      accessTokenDisplay.appendChild(btn);
    }
  }

  if (refreshToken) {
    const refreshTokenCard = document.getElementById('refreshTokenCard');
    const refreshTokenDisplay = document.getElementById('refreshTokenDisplay');
    if (refreshTokenCard) refreshTokenCard.style.display = 'block';
    if (refreshTokenDisplay) {
      refreshTokenDisplay.textContent = refreshToken;
      const btn = document.createElement('button');
      btn.className = 'copy-button';
      btn.textContent = 'Copy';
      btn.dataset.tokenType = 'refreshToken';
      btn.addEventListener('click', () => copyToClipboard('refreshToken'));
      refreshTokenDisplay.appendChild(btn);
    }
  }

  // Update user data elements
  if (userData && Object.keys(userData).length > 0) {
    const userMap = {
      profileName: userData.name || 'Unknown User',
      profileUsername: `@${userData.username || userData.login || 'unknown'}`,
      fullName: userData.name || 'N/A',
      userEmail: userData.email || 'N/A',
      userLocation: userData.location || 'N/A',
      userBlog: userData.blog || 'N/A',
      repoCount: userData.public_repos || '0',
      followerCount: userData.followers || '0',
      followingCount: userData.following || '0',
      githubId: userData.github_id || userData.id || 'N/A',
    };
    Object.entries(userMap).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    });
    const profileBio = document.getElementById('profileBio');
    if (profileBio) {
      profileBio.textContent = userData.bio || '';
      profileBio.style.display = userData.bio ? 'block' : 'none';
    }
  }
}

// Fetch user data from GitHub API if missing
async function fetchUserDataFromAPI() {
  if (!accessToken) return;
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
      },
    });
    if (response.ok) {
      const githubUser = await response.json();
      userData = {
        id: githubUser.id,
        name: githubUser.name,
        login: githubUser.login,
        email: githubUser.email,
        location: githubUser.location,
        company: githubUser.company,
        blog: githubUser.blog,
        bio: githubUser.bio,
        public_repos: githubUser.public_repos,
        followers: githubUser.followers,
        following: githubUser.following,
        avatar_url: githubUser.avatar_url,
        html_url: githubUser.html_url,
        created_at: githubUser.created_at,
        updated_at: githubUser.updated_at,
      };
      updateUI();
    } else {
      console.error('Failed to fetch user data:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
  }
}

// Optional API test
async function testAPI() {
  if (!accessToken) return;
  try {
    const response = await fetch('/api/v1/notes', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    if (response.ok) {
      showNotification('API access verified successfully!', 'success');
    } else {
      showNotification('API test failed', 'error');
    }
  } catch (error) {
    showNotification('API test error', 'error');
  }
}

// Initialize the page
window.addEventListener('DOMContentLoaded', function () {
  // Extract tokens and data from URL params
  const urlParams = new URLSearchParams(window.location.search);
  accessToken = urlParams.get('access_token') || '';
  refreshToken = urlParams.get('refresh_token') || '';
  const userDataParam = urlParams.get('user_data');
  const error = urlParams.get('error');

  if (error) {
    showNotification(`Authentication error: ${error}`, 'error');
    setTimeout(() => (window.location.href = '/'), 3000);
    return;
  }

  // Fallback to localStorage if URL empty
  if (!accessToken && !userDataParam) {
    const storedToken = localStorage.getItem('access_token');
    const storedUserData = localStorage.getItem('user_data');
    if (storedToken) accessToken = storedToken;
    if (storedUserData) {
      try {
        userData = JSON.parse(storedUserData);
      } catch (_) {}
    }
  }

  if (!accessToken) {
    showNotification('No access token found. Redirecting to login...', 'error');
    setTimeout(() => (window.location.href = '/'), 3000);
    return;
  }

  // Parse user data if available
  if (userDataParam && userDataParam.trim() !== '') {
    try {
      try {
        userData = JSON.parse(userDataParam); // URLSearchParams.get is already decoded
      } catch (_) {
        userData = JSON.parse(decodeURIComponent(userDataParam));
      }
    } catch (e) {
      console.error('Failed to parse user data:', e);
      userData = {};
    }
  } else {
    userData = {};
    if (accessToken) fetchUserDataFromAPI();
  }

  // Store tokens locally
  try {
    localStorage.setItem('access_token', accessToken);
    if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('user_data', JSON.stringify(userData));
  } catch (_) {}

  // Update UI
  updateUI();

  // Optional API test
  setTimeout(testAPI, 2000);

  // Clean URL
  try {
    window.history.replaceState({}, document.title, window.location.pathname);
  } catch (_) {}

  // Add CSS for animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
  `;
  document.head.appendChild(style);
});

// Event delegation for any copy buttons present in DOM
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.copy-button');
  if (!btn) return;
  const t = btn.dataset.tokenType;
  if (t === 'accessToken' || t === 'refreshToken') copyToClipboard(t);
});
