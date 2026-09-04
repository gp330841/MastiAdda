const express = require('express');
const jwt = require('jsonwebtoken');
const { runQuery, getQuery, allQuery } = require('./database');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'omnigames_super_secret_key_123';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  });
};

// GET /api/scores
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = await getQuery('SELECT id FROM users WHERE username = ?', [req.user.username]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const rows = await allQuery(
      'SELECT game_id, high_score, stats_json, updated_at FROM game_scores WHERE user_id = ?',
      [user.id]
    );

    const scores = {};
    rows.forEach((row) => {
      let parsedStats = {};
      try {
        parsedStats = JSON.parse(row.stats_json || '{}');
      } catch {
        parsedStats = {};
      }
      scores[row.game_id] = {
        highScore: Number(row.high_score) || 0,
        stats: parsedStats,
        updatedAt: row.updated_at,
      };
    });

    res.json({ scores, username: req.user.username });
  } catch (err) {
    console.error('Fetch scores error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/scores
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { gameId, highScore = 0, stats = {} } = req.body;
    if (!gameId || typeof gameId !== 'string') {
      return res.status(400).json({ error: 'Valid gameId is required' });
    }

    const user = await getQuery('SELECT id FROM users WHERE username = ?', [req.user.username]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const existing = await getQuery(
      'SELECT high_score, stats_json FROM game_scores WHERE user_id = ? AND game_id = ?',
      [user.id, gameId]
    );

    const safeHighScore = Math.max(
      Number(highScore) || 0,
      existing ? Number(existing.high_score) || 0 : 0
    );

    let existingStats = {};
    if (existing && existing.stats_json) {
      try {
        existingStats = JSON.parse(existing.stats_json);
      } catch {
        existingStats = {};
      }
    }

    const mergedStats = {
      ...existingStats,
      ...stats,
    };

    const statsString = JSON.stringify(mergedStats);

    await runQuery(`
      INSERT INTO game_scores (user_id, game_id, high_score, stats_json, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, game_id) DO UPDATE SET
        high_score = CASE WHEN excluded.high_score > game_scores.high_score THEN excluded.high_score ELSE game_scores.high_score END,
        stats_json = excluded.stats_json,
        updated_at = CURRENT_TIMESTAMP
    `, [user.id, gameId, safeHighScore, statsString]);

    res.json({
      message: 'Score updated successfully',
      score: {
        gameId,
        highScore: safeHighScore,
        stats: mergedStats,
      },
    });
  } catch (err) {
    console.error('Save score error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
