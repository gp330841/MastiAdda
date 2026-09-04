import test from 'node:test';
import assert from 'node:assert/strict';

import {
  initBoard,
  moveLeft,
  moveRight,
  moveUp,
  moveDown,
  canMove,
  hasWon,
  hasLost,
  getTileColor,
  getTextColor,
} from './2048Logic.js';

test('2048: initBoard has exactly 2 non-zero tiles', () => {
  const board = initBoard();
  const nonZero = board.filter(v => v > 0);
  assert.equal(nonZero.length, 2);
  assert.equal(board.length, 16);
});

test('2048: moveLeft shifts and merges adjacent matching numbers', () => {
  // Row 0: [2, 2, 4, 8] -> [4, 4, 8, 0]
  const board = [
    2, 2, 4, 8,
    0, 0, 0, 0,
    0, 0, 0, 0,
    0, 0, 0, 0,
  ];
  const { board: newBoard, score, moved } = moveLeft(board);
  assert.equal(moved, true);
  assert.equal(score, 4);
  assert.deepEqual(newBoard.slice(0, 4), [4, 4, 8, 0]);
});

test('2048: moveRight shifts and merges correctly', () => {
  const board = [
    2, 2, 4, 8,
    0, 0, 0, 0,
    0, 0, 0, 0,
    0, 0, 0, 0,
  ];
  const { board: newBoard, score, moved } = moveRight(board);
  assert.equal(moved, true);
  assert.equal(score, 4);
  assert.deepEqual(newBoard.slice(0, 4), [0, 4, 4, 8]);
});

test('2048: moveUp and moveDown shift vertical columns', () => {
  const board = [
    2, 0, 0, 0,
    2, 0, 0, 0,
    4, 0, 0, 0,
    4, 0, 0, 0,
  ];
  const upResult = moveUp(board);
  assert.equal(upResult.moved, true);
  assert.equal(upResult.score, 12);
  assert.equal(upResult.board[0], 4);
  assert.equal(upResult.board[4], 8);

  const downResult = moveDown(board);
  assert.equal(downResult.moved, true);
  assert.equal(downResult.score, 12);
  assert.equal(downResult.board[8], 4);
  assert.equal(downResult.board[12], 8);
});

test('2048: hasWon checks for >= 2048', () => {
  assert.equal(hasWon([2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 0, 0, 0, 0, 0, 0]), false);
  assert.equal(hasWon([2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 0, 0, 0, 0, 0]), true);
});

test('2048: hasLost accurately detects locked board with no moves left', () => {
  const fullBoardNoMoves = [
    2, 4, 2, 4,
    4, 2, 4, 2,
    2, 4, 2, 4,
    4, 2, 4, 2,
  ];
  assert.equal(canMove(fullBoardNoMoves), false);
  assert.equal(hasLost(fullBoardNoMoves), true);

  const fullBoardWithMove = [
    2, 2, 2, 4,
    4, 2, 4, 2,
    2, 4, 2, 4,
    4, 2, 4, 2,
  ];
  assert.equal(canMove(fullBoardWithMove), true);
  assert.equal(hasLost(fullBoardWithMove), false);
});

test('2048: getTileColor and getTextColor return valid contrasts for all denominations', () => {
  assert.equal(getTileColor(2), '#eee4da');
  assert.equal(getTileColor(2048), '#edc22e');
  assert.equal(getTileColor(4096), '#3c3c2f');

  assert.equal(getTextColor(2), '#776e65');
  assert.equal(getTextColor(4), '#776e65');
  assert.equal(getTextColor(8), '#f9f6f2');
  assert.equal(getTextColor(2048), '#f9f6f2');
});

test('2048: multi-merge [4, 4, 4, 4] merges into [8, 8, 0, 0] in a single move', () => {
  const board = [
    4, 4, 4, 4,
    0, 0, 0, 0,
    0, 0, 0, 0,
    0, 0, 0, 0,
  ];
  const { board: newBoard, score, moved } = moveLeft(board);
  assert.equal(moved, true);
  assert.equal(score, 16);
  assert.deepEqual(newBoard.slice(0, 4), [8, 8, 0, 0]);
});
