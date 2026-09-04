const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Determine path for db file
const dbPath = path.resolve(__dirname, 'omnidata.db');

// Connect to the DB
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening db:', err.message);
  } else {
    console.log('[+] Connected to SQLite database.');

    // Create users table if it doesn't exist
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error creating users table:', err.message);
      } else {
        console.log('[+] Users table ready.');
      }
    });

    // Create game_scores table if it doesn't exist
    db.run(`
      CREATE TABLE IF NOT EXISTS game_scores (
        user_id INTEGER NOT NULL,
        game_id TEXT NOT NULL,
        high_score INTEGER NOT NULL DEFAULT 0,
        stats_json TEXT NOT NULL DEFAULT '{}',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, game_id)
      )
    `, (err) => {
      if (err) {
        console.error('Error creating game_scores table:', err.message);
      } else {
        console.log('[+] Game scores table ready.');
      }
    });
  }
});

// Utility wrappers for Promises
const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

const getQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
};

const allQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
};

module.exports = {
  db,
  runQuery,
  getQuery,
  allQuery
};
