import test from 'node:test';
import assert from 'node:assert/strict';

import { mergeScores } from './scoreSync.js';

test('scoreSync: mergeScores takes the highest score for a game', () => {
  const local = {
    '2048': { highScore: 1024, stats: {} },
    'tictactoe': { highScore: 0, stats: { wins: 5 } },
  };

  const remote = {
    '2048': { highScore: 2048, stats: {} },
    'tictactoe': { highScore: 0, stats: { wins: 6, losses: 2 } },
    'chess': { highScore: 0, stats: { wins: 1 } },
  };

  const merged = mergeScores(local, remote);

  assert.equal(merged['2048'].highScore, 2048);
  assert.equal(merged['tictactoe'].stats.wins, 6);
  assert.equal(merged['tictactoe'].stats.losses, 2);
  assert.equal(merged['chess'].stats.wins, 1);
});

test('scoreSync: mergeScores preserves local higher score if remote is lower', () => {
  const local = {
    '2048': { highScore: 4096, stats: {} },
  };

  const remote = {
    '2048': { highScore: 2048, stats: {} },
  };

  const merged = mergeScores(local, remote);
  assert.equal(merged['2048'].highScore, 4096);
});

test('scoreSync: mergeScores gracefully handles empty objects', () => {
  const merged = mergeScores({}, { '2048': { highScore: 512, stats: {} } });
  assert.equal(merged['2048'].highScore, 512);

  const mergedEmpty = mergeScores({}, {});
  assert.deepEqual(mergedEmpty, {});
});
