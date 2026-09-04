import test from 'node:test';
import assert from 'node:assert/strict';
import { initBoard as init2048Board } from './2048Logic.js';
import { initBoard as initChessBoard } from './chessLogic.js';

test('Game State Persistence: 2048 in-progress state serialization and restoration', () => {
  const sampleBoard = init2048Board();
  sampleBoard[0] = 2;
  sampleBoard[1] = 4;
  sampleBoard[2] = 8;
  const score = 256;
  const history = [{ board: init2048Board(), score: 0 }];

  const stateToStore = {
    board: sampleBoard,
    score,
    won: false,
    hasDismissedWin: false,
    history,
    savedAt: Date.now(),
  };

  const serialized = JSON.stringify(stateToStore);
  const parsed = JSON.parse(serialized);

  assert.equal(Array.isArray(parsed.board), true);
  assert.equal(parsed.board.length, 16);
  assert.equal(parsed.score, 256);
  assert.equal(parsed.won, false);
  assert.equal(parsed.history.length, 1);
  assert.equal(parsed.board[0], 2);
  assert.equal(parsed.board[1], 4);
  assert.equal(parsed.board[2], 8);
});

test('Game State Persistence: Chess in-progress state serialization and restoration', () => {
  const board = initChessBoard();
  board[4][4] = 'P';
  board[6][4] = null;

  const chessState = {
    gameMode: '1p',
    board,
    currentPlayer: 'black',
    moveHistory: [{ from: { row: 6, col: 4 }, to: { row: 4, col: 4 }, piece: 'P' }],
    capturedPieces: { white: [], black: [] },
    lastMove: { from: { row: 6, col: 4 }, to: { row: 4, col: 4 } },
    savedAt: Date.now(),
  };

  const serialized = JSON.stringify(chessState);
  const parsed = JSON.parse(serialized);

  assert.equal(parsed.gameMode, '1p');
  assert.equal(parsed.currentPlayer, 'black');
  assert.equal(parsed.board[4][4], 'P');
  assert.equal(parsed.board[6][4], null);
  assert.equal(parsed.moveHistory.length, 1);
  assert.equal(parsed.lastMove.to.row, 4);
});

test('Game State Persistence: Ludo in-progress state serialization and restoration', () => {
  const ludoState = {
    players: {
      red: [
        { id: 0, status: 'active', step: 15 },
        { id: 1, status: 'base', step: 0 },
        { id: 2, status: 'base', step: 0 },
        { id: 3, status: 'base', step: 0 },
      ],
      green: [
        { id: 0, status: 'base', step: 0 },
        { id: 1, status: 'base', step: 0 },
        { id: 2, status: 'base', step: 0 },
        { id: 3, status: 'base', step: 0 },
      ],
      yellow: [
        { id: 0, status: 'base', step: 0 },
        { id: 1, status: 'base', step: 0 },
        { id: 2, status: 'base', step: 0 },
        { id: 3, status: 'base', step: 0 },
      ],
      blue: [
        { id: 0, status: 'base', step: 0 },
        { id: 1, status: 'base', step: 0 },
        { id: 2, status: 'base', step: 0 },
        { id: 3, status: 'base', step: 0 },
      ],
    },
    turn: 'red',
    activePlayers: ['red', 'green', 'yellow', 'blue'],
    isBot: { red: false, green: true, yellow: true, blue: true },
    diceRoll: 4,
    message: 'Red rolled a 4. Choose a token.',
    hasRolled: true,
    playerNames: { red: 'Red', green: 'Green', yellow: 'Yellow', blue: 'Blue' },
    savedAt: Date.now(),
  };

  const serialized = JSON.stringify(ludoState);
  const parsed = JSON.parse(serialized);

  assert.equal(parsed.turn, 'red');
  assert.equal(parsed.players.red[0].status, 'active');
  assert.equal(parsed.players.red[0].step, 15);
  assert.equal(parsed.diceRoll, 4);
  assert.equal(parsed.hasRolled, true);
  assert.equal(parsed.activePlayers.length, 4);
});

test('Game State Persistence: TicTacToe in-progress state serialization and restoration', () => {
  const tttState = {
    board: ['X', null, 'O', null, 'X', null, null, null, null],
    isXNext: false,
    gameMode: '1p',
    savedAt: Date.now(),
  };

  const serialized = JSON.stringify(tttState);
  const parsed = JSON.parse(serialized);

  assert.equal(parsed.board[0], 'X');
  assert.equal(parsed.board[2], 'O');
  assert.equal(parsed.board[4], 'X');
  assert.equal(parsed.isXNext, false);
  assert.equal(parsed.gameMode, '1p');
});
