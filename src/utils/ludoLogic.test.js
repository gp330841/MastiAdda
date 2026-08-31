import test from 'node:test';
import assert from 'node:assert/strict';

import { getPlayableTokens, chooseBestBotMove } from './ludoLogic.js';

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
