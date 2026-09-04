import test from 'node:test';
import assert from 'node:assert/strict';
import { getPlayableTokens, chooseBestBotMove, isPositionSafe, hasPlayerWon } from './ludoLogic.js';

test('getPlayableTokens allows pieces to leave base on a roll of 6 and keeps active pieces legal', () => {
  const players = {
    red: [
      { id: 0, status: 'base', step: 0 },
      { id: 1, status: 'base', step: 0 },
      { id: 2, status: 'active', step: 10 },
    ],
    green: [
      { id: 0, status: 'base', step: 0 },
    ],
    yellow: [
      { id: 0, status: 'base', step: 0 },
    ],
    blue: [
      { id: 0, status: 'base', step: 0 },
    ],
  };

  const playable = getPlayableTokens('red', players, 6);
  assert.equal(playable.length, 3);
  assert.deepEqual(playable.map(({ id }) => id), [0, 1, 2]);
});

test('getPlayableTokens excludes moves that overshoot step 57 (home)', () => {
  const players = {
    red: [
      { id: 0, status: 'active', step: 55 },
      { id: 1, status: 'active', step: 56 },
    ],
  };

  // On roll 2: token 0 reaches 57 (home, legal), token 1 would reach 58 (overshoot, illegal)
  const playable = getPlayableTokens('red', players, 2);
  assert.equal(playable.length, 1);
  assert.equal(playable[0].id, 0);
});

test('chooseBestBotMove prefers a capture move when one is available', () => {
  const players = {
    red: [
      { id: 0, status: 'active', step: 0 },
      { id: 1, status: 'base', step: 0 },
    ],
    green: [
      { id: 0, status: 'active', step: 40 },
      { id: 1, status: 'base', step: 0 },
    ],
    yellow: [
      { id: 0, status: 'base', step: 0 },
    ],
    blue: [
      { id: 0, status: 'base', step: 0 },
    ],
  };

  const move = chooseBestBotMove('red', players, 1);
  assert.equal(move?.tokenId, 0);
  assert.equal(move?.reason, 'capture');
});

test('isPositionSafe identifies safe starting squares and star spots', () => {
  // Red start spot [6, 1] is safe
  assert.equal(isPositionSafe([6, 1]), true);
  // Green start spot [1, 8] is safe
  assert.equal(isPositionSafe([1, 8]), true);
  // Star cell [2, 6] is safe
  assert.equal(isPositionSafe([2, 6]), true);
  // Non-safe path cell [6, 3] is NOT safe
  assert.equal(isPositionSafe([6, 3]), false);
});

test('hasPlayerWon detects when all 4 tokens have reached home', () => {
  const wonTokens = [
    { id: 0, status: 'home' },
    { id: 1, status: 'home' },
    { id: 2, status: 'home' },
    { id: 3, status: 'home' },
  ];
  assert.equal(hasPlayerWon(wonTokens), true);

  const incompleteTokens = [
    { id: 0, status: 'home' },
    { id: 1, status: 'active' },
    { id: 2, status: 'home' },
    { id: 3, status: 'home' },
  ];
  assert.equal(hasPlayerWon(incompleteTokens), false);
});
