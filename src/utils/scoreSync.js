/**
 * Multi-Session Cloud & Local Score Synchronization
 * Keeps high scores and game stats synchronized across sessions, devices, and browser tabs.
 */

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE)
  ? import.meta.env.VITE_API_BASE.replace(/\/auth$/, '')
  : '/api';

const BROADCAST_CHANNEL_NAME = 'omni_scores_channel';
let broadcastChannel = null;

if (typeof window !== 'undefined' && typeof window.BroadcastChannel !== 'undefined') {
  try {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  } catch {
    broadcastChannel = null;
  }
}

/**
 * Pure helper to merge local and remote score states safely
 */
export const mergeScores = (local = {}, remote = {}) => {
  const merged = { ...local };

  Object.entries(remote).forEach(([gameId, remoteItem]) => {
    const localItem = merged[gameId] || { highScore: 0, stats: {} };
    const bestHighScore = Math.max(
      Number(localItem.highScore) || 0,
      Number(remoteItem.highScore) || 0
    );

    merged[gameId] = {
      highScore: bestHighScore,
      stats: {
        ...(localItem.stats || {}),
        ...(remoteItem.stats || {}),
      },
      updatedAt: remoteItem.updatedAt || localItem.updatedAt,
    };
  });

  return merged;
};

// Internal score cache in memory
let cachedScores = {};
const listeners = new Set();
let isInitialized = false;

const notifyListeners = () => {
  listeners.forEach((listener) => {
    try {
      listener(cachedScores);
    } catch (err) {
      console.error('Score listener error:', err);
    }
  });
};

const getStorageKey = (username) => {
  return username ? `omni_scores_${username}` : 'omni_scores_guest';
};

/**
 * Load cached scores from localStorage with legacy 2048 and guest migration
 */
export const loadCachedScores = (username) => {
  if (typeof window === 'undefined') return {};
  let scores = {};

  try {
    const raw = localStorage.getItem(getStorageKey(username));
    if (raw) {
      scores = JSON.parse(raw);
    }
  } catch {
    // Fallback to empty
  }

  // Merge guest scores if user is logged in
  if (username) {
    try {
      const guestRaw = localStorage.getItem('omni_scores_guest');
      if (guestRaw) {
        const guestScores = JSON.parse(guestRaw);
        scores = mergeScores(scores, guestScores);
      }
    } catch {
      // Ignore
    }
  }

  // Migrate standalone legacy 2048_best_score if present
  try {
    const legacy2048 = parseInt(localStorage.getItem('2048_best_score') || '0', 10);
    const current2048 = Number(scores['2048']?.highScore) || 0;
    if (legacy2048 > current2048) {
      scores['2048'] = {
        highScore: legacy2048,
        stats: scores['2048']?.stats || {},
        updatedAt: new Date().toISOString(),
      };
    }
  } catch {
    // Ignore
  }

  return scores;
};

/**
 * Save cached scores to localStorage and mirror standalone keys
 */
const saveCachedScores = (username, scores) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getStorageKey(username), JSON.stringify(scores));
    // Keep legacy 2048_best_score key synchronized
    if (scores['2048']?.highScore) {
      localStorage.setItem('2048_best_score', scores['2048'].highScore.toString());
    }
  } catch {
    // Graceful storage quota fallback
  }
};

/**
 * Subscribe to score changes
 */
export const subscribeToScores = (callback) => {
  listeners.add(callback);
  callback(cachedScores);
  return () => {
    listeners.delete(callback);
  };
};

/**
 * Get current score for a game
 */
export const getGameScore = (gameId) => {
  return cachedScores[gameId] || { highScore: 0, stats: {} };
};

/**
 * Push a single score to Cloudflare D1 / server with keepalive support
 */
export const pushScoreToCloud = async (gameId, highScore, stats = {}, token = null) => {
  if (typeof window === 'undefined') return false;
  const authToken = token || localStorage.getItem('omni_token');
  if (!authToken) return false;

  try {
    const res = await fetch(`${API_BASE}/scores`, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        gameId,
        highScore,
        stats,
      }),
    });
    return res.ok;
  } catch (err) {
    console.warn(`Could not sync ${gameId} score to cloud (will retry on focus):`, err);
    return false;
  }
};

/**
 * Fetch remote scores from Cloudflare D1 / server and perform bidirectional sync
 */
export const fetchRemoteScores = async () => {
  if (typeof window === 'undefined') return cachedScores;
  const token = localStorage.getItem('omni_token');
  const user = localStorage.getItem('omni_user');
  if (!token || !user) return cachedScores;

  try {
    const res = await fetch(`${API_BASE}/scores`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) return cachedScores;

    let data = null;
    try {
      const text = await res.text();
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (data && data.scores) {
      const remote = data.scores;
      const merged = mergeScores(cachedScores, remote);

      // Bidirectional sync: if local device achieved higher score than remote cloud,
      // upload the higher local score to cloud immediately
      const toUpload = [];
      Object.entries(cachedScores).forEach(([gId, localVal]) => {
        const localHigh = Number(localVal?.highScore) || 0;
        const remoteHigh = Number(remote[gId]?.highScore) || 0;
        if (localHigh > remoteHigh) {
          toUpload.push({ gameId: gId, highScore: localHigh, stats: localVal?.stats || {} });
        }
      });

      cachedScores = merged;
      saveCachedScores(user, cachedScores);
      notifyListeners();

      if (toUpload.length > 0) {
        for (const item of toUpload) {
          await pushScoreToCloud(item.gameId, item.highScore, item.stats, token);
        }
      }
    }
  } catch {
    // Offline or network error - gracefully rely on cached scores
  }

  return cachedScores;
};

/**
 * Save / Update a game's score and stats
 */
export const saveGameScore = async (gameId, { highScore = 0, stats = {} }) => {
  if (typeof window === 'undefined') return;
  const user = localStorage.getItem('omni_user');
  const token = localStorage.getItem('omni_token');

  const current = cachedScores[gameId] || { highScore: 0, stats: {} };
  const updatedHighScore = Math.max(Number(current.highScore) || 0, Number(highScore) || 0);
  const updatedStats = {
    ...(current.stats || {}),
    ...stats,
  };

  cachedScores = {
    ...cachedScores,
    [gameId]: {
      highScore: updatedHighScore,
      stats: updatedStats,
      updatedAt: new Date().toISOString(),
    },
  };

  saveCachedScores(user, cachedScores);
  notifyListeners();

  // Broadcast to other tabs on same device
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: 'SCORE_UPDATE', gameId, scores: cachedScores });
    } catch {
      // Ignore broadcast errors
    }
  }

  // Push to Cloudflare D1
  if (token && user) {
    await pushScoreToCloud(gameId, updatedHighScore, updatedStats, token);
  }
};

let currentSyncedUser = null;

/**
 * Initialize cross-tab and cross-device score syncing
 */
export const initScoreSync = (forceUser = null) => {
  if (typeof window === 'undefined') return;
  const user = forceUser || localStorage.getItem('omni_user');

  if (isInitialized && currentSyncedUser === user) {
    // Re-check remote scores on explicit call
    fetchRemoteScores();
    return;
  }

  isInitialized = true;
  currentSyncedUser = user;

  cachedScores = loadCachedScores(user);
  saveCachedScores(user, cachedScores);
  notifyListeners();

  // Initial bidirectional fetch from cloud
  fetchRemoteScores();

  // Multi-tab sync via BroadcastChannel
  if (broadcastChannel) {
    broadcastChannel.onmessage = (event) => {
      if (event.data && event.data.type === 'SCORE_UPDATE' && event.data.scores) {
        cachedScores = mergeScores(cachedScores, event.data.scores);
        saveCachedScores(localStorage.getItem('omni_user'), cachedScores);
        notifyListeners();
      }
    };
  }

  // Auto-sync on network reconnect
  window.addEventListener('online', () => {
    fetchRemoteScores();
  });

  // Cross-device sync: when window gains focus or tab becomes visible again
  window.addEventListener('focus', () => {
    fetchRemoteScores();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      fetchRemoteScores();
    }
  });

  // Storage event fallback for cross-tab sync and direct 2048 key updates
  window.addEventListener('storage', (e) => {
    if (e.key && (e.key.startsWith('omni_scores_') || e.key === '2048_best_score')) {
      const activeUser = localStorage.getItem('omni_user');
      cachedScores = loadCachedScores(activeUser);
      notifyListeners();
    }
  });
};
