import test from 'node:test';
import assert from 'node:assert/strict';

import { getRPSWinner, getBotChoice, getChoiceEmoji, CHOICES } from './rpsLogic.js';

test('RPS: correct winner outcomes', () => {
  // Draws
  assert.equal(getRPSWinner('rock', 'rock'), 'draw');
  assert.equal(getRPSWinner('paper', 'paper'), 'draw');
  assert.equal(getRPSWinner('scissors', 'scissors'), 'draw');

  // Player wins
  assert.equal(getRPSWinner('rock', 'scissors'), 'player');
  assert.equal(getRPSWinner('paper', 'rock'), 'player');
  assert.equal(getRPSWinner('scissors', 'paper'), 'player');

  // Bot wins
  assert.equal(getRPSWinner('rock', 'paper'), 'bot');
  assert.equal(getRPSWinner('paper', 'scissors'), 'bot');
  assert.equal(getRPSWinner('scissors', 'rock'), 'bot');
});

test('RPS: getBotChoice returns valid move', () => {
  const choice = getBotChoice(['rock', 'rock', 'rock']);
  assert.ok(CHOICES.includes(choice));
});

test('RPS: getChoiceEmoji returns emojis for valid choices', () => {
  assert.equal(getChoiceEmoji('rock'), '✊');
  assert.equal(getChoiceEmoji('paper'), '✋');
  assert.equal(getChoiceEmoji('scissors'), '✌️');
});
