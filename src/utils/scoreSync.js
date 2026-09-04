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
 * Load cached scores from localStorage
 */
export const loadCachedScores = (username) => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(getStorageKey(username));
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // Fallback to empty
  }
  return {};
};

/**
 * Save cached scores to localStorage
 */
const saveCachedScores = (username, scores) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getStorageKey(username), JSON.stringify(scores));
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
 * Fetch remote scores from Cloudflare D1 / server
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

    const data = await res.json();
    if (data && data.scores) {
      cachedScores = mergeScores(cachedScores, data.scores);
      saveCachedScores(user, cachedScores);
      notifyListeners();
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

  // Sync to Cloudflare D1
  if (token && user) {
    try {
      await fetch(`${API_BASE}/scores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          gameId,
          highScore: updatedHighScore,
          stats: updatedStats,
        }),
      });
    } catch {
      // Offline: will sync next time online or on tab focus
    }
  }
};

/**
 * Initialize cross-tab and cross-device score syncing
 */
export const initScoreSync = () => {
  if (typeof window === 'undefined' || isInitialized) return;
  isInitialized = true;

  const user = localStorage.getItem('omni_user');
  cachedScores = loadCachedScores(user);
  notifyListeners();

  // Initial fetch from cloud
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

  // Cross-device sync: when window gains focus or tab becomes visible again
  window.addEventListener('focus', () => {
    fetchRemoteScores();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      fetchRemoteScores();
    }
  });

  // Storage event fallback for cross-tab sync
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('omni_scores_')) {
      try {
        const updated = JSON.parse(e.newValue || '{}');
        cachedScores = mergeScores(cachedScores, updated);
        notifyListeners();
      } catch {
        // Ignore JSON error
      }
    }
  });
};
