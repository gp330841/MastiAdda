import test from 'node:test';
import assert from 'node:assert/strict';

import {
  checkWinner,
  isBoardFull,
  getAvailableMoves,
  getBestBotMove,
} from './tictactoeLogic.js';

test('TicTacToe: detects horizontal, vertical, and diagonal wins', () => {
  // Horizontal win
  const rowBoard = ['X', 'X', 'X', null, 'O', null, null, null, 'O'];
  const rowWinner = checkWinner(rowBoard);
  assert.equal(rowWinner?.player, 'X');
  assert.deepEqual(rowWinner?.line, [0, 1, 2]);

  // Vertical win
  const colBoard = ['O', 'X', null, 'O', 'X', null, 'O', null, null];
  const colWinner = checkWinner(colBoard);
  assert.equal(colWinner?.player, 'O');
  assert.deepEqual(colWinner?.line, [0, 3, 6]);

  // Diagonal win
  const diagBoard = ['X', null, 'O', null, 'X', null, 'O', null, 'X'];
  const diagWinner = checkWinner(diagBoard);
  assert.equal(diagWinner?.player, 'X');
  assert.deepEqual(diagWinner?.line, [0, 4, 8]);
});

test('TicTacToe: detects board fullness and draws correctly', () => {
  const fullBoard = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'];
  assert.equal(isBoardFull(fullBoard), true);
  assert.equal(checkWinner(fullBoard), null);

  const partialBoard = ['X', null, 'O', null, null, null, null, null, null];
  assert.equal(isBoardFull(partialBoard), false);
  assert.equal(getAvailableMoves(partialBoard).length, 7);
});

test('TicTacToe AI: Bot takes winning move when available', () => {
  // 'O' has squares 0 and 1, square 2 is empty -> bot MUST choose 2 to win!
  const board = ['O', 'O', null, 'X', 'X', null, null, null, null];
  const move = getBestBotMove(board);
  assert.equal(move, 2);
});

test('TicTacToe AI: Bot blocks opponent winning move', () => {
  // 'X' has squares 3 and 4, square 5 is empty -> bot MUST choose 5 to block!
  const board = ['O', null, null, 'X', 'X', null, null, null, null];
  const move = getBestBotMove(board);
  assert.equal(move, 5);
});

test('TicTacToe AI: Bot takes center when board is open', () => {
  const board = ['X', null, null, null, null, null, null, null, null];
  const move = getBestBotMove(board);
  assert.equal(move, 4);
});
