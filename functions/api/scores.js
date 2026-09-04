import { json, readToken } from '../_lib/auth.js';

const ensureTable = async (db) => {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS game_scores (
      user_id INTEGER NOT NULL,
      game_id TEXT NOT NULL,
      high_score INTEGER NOT NULL DEFAULT 0,
      stats_json TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, game_id)
    )
  `).run();
};

export const onRequestGet = async ({ request, env }) => {
  try {
    const token = await readToken(request, env.JWT_SECRET);
    if (!token) return json({ error: 'Unauthorized' }, 401);

    await ensureTable(env.DB);

    const { results } = await env.DB.prepare(
      'SELECT game_id, high_score, stats_json, updated_at FROM game_scores WHERE user_id = ?'
    ).bind(token.id).all();

    const scores = {};
    if (Array.isArray(results)) {
      results.forEach((row) => {
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
    }

    return json({ scores, username: token.username });
  } catch (error) {
    console.error('Fetch scores error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
};

export const onRequestPost = async ({ request, env }) => {
  try {
    const token = await readToken(request, env.JWT_SECRET);
    if (!token) return json({ error: 'Unauthorized' }, 401);

    const body = await request.json();
    const { gameId, highScore = 0, stats = {} } = body;

    if (!gameId || typeof gameId !== 'string') {
      return json({ error: 'Valid gameId is required' }, 400);
    }

    await ensureTable(env.DB);

    // Retrieve existing to merge stats cleanly if needed
    const existing = await env.DB.prepare(
      'SELECT high_score, stats_json FROM game_scores WHERE user_id = ? AND game_id = ?'
    ).bind(token.id, gameId).first();

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

    await env.DB.prepare(`
      INSERT INTO game_scores (user_id, game_id, high_score, stats_json, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, game_id) DO UPDATE SET
        high_score = MAX(game_scores.high_score, excluded.high_score),
        stats_json = excluded.stats_json,
        updated_at = CURRENT_TIMESTAMP
    `).bind(token.id, gameId, safeHighScore, statsString).run();

    return json({
      message: 'Score updated successfully',
      score: {
        gameId,
        highScore: safeHighScore,
        stats: mergedStats,
      },
    });
  } catch (error) {
    console.error('Save score error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
};
