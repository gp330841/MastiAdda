import test from 'node:test';
import assert from 'node:assert/strict';

import {
  initBoard,
  getPawnAttacks,
  movePiece,
  isInCheck,
  isCheckmate,
  isStalemate,
  isPawnPromotion,
} from './chessLogic.js';

import { getBestMove } from './chessAI.js';

test('Chess: initial board is setup with 16 white and 16 black pieces', () => {
  const board = initBoard();
  let whiteCount = 0;
  let blackCount = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c]) {
        if (board[r][c] === board[r][c].toUpperCase()) whiteCount++;
        else blackCount++;
      }
    }
  }
  assert.equal(whiteCount, 16);
  assert.equal(blackCount, 16);
});

test('Chess: pawn only attacks diagonally, not straight ahead', () => {
  const board = Array(8).fill(null).map(() => Array(8).fill(null));
  board[4][4] = 'P'; // White pawn at (4,4)
  const attacks = getPawnAttacks(board, 4, 4);
  assert.deepEqual(attacks, [{ row: 3, col: 3 }, { row: 3, col: 5 }]);

  // Black pawn at (2,4)
  board[2][4] = 'p';
  const blackAttacks = getPawnAttacks(board, 2, 4);
  assert.deepEqual(blackAttacks, [{ row: 3, col: 3 }, { row: 3, col: 5 }]);
});

test('Chess: King in front of pawn is NOT in check', () => {
  const board = Array(8).fill(null).map(() => Array(8).fill(null));
  board[7][4] = 'K'; // White King at (7,4)
  board[6][4] = 'p'; // Black pawn at (6,4) - straight in front of King!
  board[0][0] = 'k'; // Black King somewhere safe

  // White King should NOT be in check from a pawn directly above it
  assert.equal(isInCheck(board, 'white'), false);
});

test('Chess: King diagonally adjacent to pawn IS in check', () => {
  const board = Array(8).fill(null).map(() => Array(8).fill(null));
  board[7][4] = 'K'; // White King at (7,4)
  board[6][3] = 'p'; // Black pawn at (6,3) - attacks (7,4)!
  board[0][0] = 'k';

  assert.equal(isInCheck(board, 'white'), true);
});

test('Chess: Fools mate detected as checkmate', () => {
  // 1. f3 e5 2. g4 Qh4#
  const board = initBoard();
  board[6][5] = null; board[5][5] = 'P'; // f2-f3
  board[1][4] = null; board[3][4] = 'p'; // e7-e5
  board[6][6] = null; board[4][6] = 'P'; // g2-g4
  board[0][3] = null; board[4][7] = 'q'; // d8-h4#

  assert.equal(isInCheck(board, 'white'), true);
  assert.equal(isCheckmate(board, 'white'), true);
});

test('Chess: Stalemate detected correctly', () => {
  const board = Array(8).fill(null).map(() => Array(8).fill(null));
  board[0][0] = 'k'; // Black king trapped at a8
  board[1][2] = 'Q'; // White Queen at c7 covering b8, a7, b7
  board[2][1] = 'K'; // White King at b6 defending Queen

  assert.equal(isInCheck(board, 'black'), false);
  assert.equal(isStalemate(board, 'black'), true);
});

test('Chess: Pawn promotion check', () => {
  assert.equal(isPawnPromotion('P', 0), true);
  assert.equal(isPawnPromotion('P', 1), false);
  assert.equal(isPawnPromotion('p', 7), true);
  assert.equal(isPawnPromotion('p', 6), false);
});

test('Chess AI: AI finds a valid move for black', () => {
  const board = initBoard();
  // Move white pawn
  const { board: movedBoard } = movePiece(board, 6, 4, 4, 4);
  const bestMove = getBestMove(movedBoard, 'black');
  assert.ok(bestMove !== null);
  assert.ok(bestMove.from !== undefined);
  assert.ok(bestMove.to !== undefined);
});
