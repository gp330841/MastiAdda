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
  getPieceValue,
  getLegalMovesForPiece,
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

test('Chess: getPieceValue evaluates pieces correctly', () => {
  assert.equal(getPieceValue('P'), 10);
  assert.equal(getPieceValue('p'), 10);
  assert.equal(getPieceValue('N'), 30);
  assert.equal(getPieceValue('n'), 30);
  assert.equal(getPieceValue('B'), 30);
  assert.equal(getPieceValue('b'), 30);
  assert.equal(getPieceValue('R'), 50);
  assert.equal(getPieceValue('r'), 50);
  assert.equal(getPieceValue('Q'), 90);
  assert.equal(getPieceValue('q'), 90);
  assert.equal(getPieceValue('K'), 900);
  assert.equal(getPieceValue('k'), 900);
  assert.equal(getPieceValue(null), 0);
  assert.equal(getPieceValue(''), 0);
});

test('Chess: movePiece moves piece and returns captured piece', () => {
  const board = Array(8).fill(null).map(() => Array(8).fill(null));
  board[4][4] = 'R'; // White Rook
  board[4][6] = 'p'; // Black pawn

  const { board: nextBoard, captured } = movePiece(board, 4, 4, 4, 6);
  assert.equal(captured, 'p');
  assert.equal(nextBoard[4][4], null);
  assert.equal(nextBoard[4][6], 'R');
});

test('Chess: pinned piece cannot move off the pin line', () => {
  const board = Array(8).fill(null).map(() => Array(8).fill(null));
  board[7][4] = 'K'; // White King at e1
  board[5][4] = 'R'; // White Rook at e3
  board[1][4] = 'r'; // Black Rook at e7 (pinning White Rook to King along file e)
  board[0][0] = 'k'; // Black King safe at a8

  const legalMoves = getLegalMovesForPiece(board, 5, 4);
  // White Rook can only move along column 4 (towards or attacking the black rook)
  // It cannot move horizontally (e.g. to (5, 3) or (5, 5)) because that exposes the King
  assert.ok(legalMoves.length > 0);
  for (const move of legalMoves) {
    assert.equal(move.col, 4, `Move col must be 4 to stay on pin ray, was: ${move.col}`);
  }
});

