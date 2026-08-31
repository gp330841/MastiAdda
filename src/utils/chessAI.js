/**
 * Chess AI - Bot player using minimax algorithm with alpha-beta pruning
 */

import {
  getLegalMovesForPiece,
  movePiece,
  isCheckmate,
  isStalemate,
  isPawnPromotion,
  promotePawn,
  getPieceColor,
  getPieceValue,
  BOARD_SIZE,
} from './chessLogic.js';

const MAX_DEPTH = 3;

/**
 * Evaluate board position from bot's perspective
 */
const evaluateBoard = (board, botColor) => {
  let score = 0;

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col];
      if (piece) {
        const value = getPieceValue(piece);
        const color = getPieceColor(piece);
        const isBot = color === botColor;

        // Material score
        score += isBot ? value : -value;

        // Position bonus: center control
        const centerDistance = Math.abs(row - 3.5) + Math.abs(col - 3.5);
        const positionBonus = (7 - centerDistance) * 0.5;
        score += isBot ? positionBonus : -positionBonus;

        // Pawn advancement bonus
        if (piece.toUpperCase() === 'P') {
          if (color === 'black') {
            score += isBot ? row * 1.5 : -row * 1.5;
          } else {
            score += isBot ? (7 - row) * 1.5 : -(7 - row) * 1.5;
          }
        }
      }
    }
  }

  return score;
};

/**
 * Generate all legal moves for a given player color
 */
const getAllLegalMoves = (board, color) => {
  const moves = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col];
      if (piece && getPieceColor(piece) === color) {
        const legalDests = getLegalMovesForPiece(board, row, col);
        for (let dest of legalDests) {
          let { board: newBoard, captured } = movePiece(board, row, col, dest.row, dest.col);
          // Check for promotion in simulation
          if (isPawnPromotion(piece, dest.row)) {
            newBoard = promotePawn(newBoard, dest.row, dest.col, color === 'white' ? 'Q' : 'q');
          }
          moves.push({
            from: { row, col },
            to: dest,
            board: newBoard,
            captured,
          });
        }
      }
    }
  }
  return moves;
};

/**
 * Minimax algorithm with alpha-beta pruning
 */
const minimax = (board, depth, alpha, beta, isMaximizing, botColor) => {
  const opponentColor = botColor === 'black' ? 'white' : 'black';
  const currentColor = isMaximizing ? botColor : opponentColor;

  if (isCheckmate(board, currentColor)) {
    // Current player checkmated: bad for current player
    return isMaximizing ? -10000 - depth : 10000 + depth;
  }
  if (isStalemate(board, currentColor)) {
    return 0;
  }
  if (depth === 0) {
    return evaluateBoard(board, botColor);
  }

  const moves = getAllLegalMoves(board, currentColor);
  if (moves.length === 0) {
    return 0;
  }

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (let move of moves) {
      const eval_ = minimax(move.board, depth - 1, alpha, beta, false, botColor);
      maxEval = Math.max(maxEval, eval_);
      alpha = Math.max(alpha, eval_);
      if (beta <= alpha) break; // Beta cutoff
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (let move of moves) {
      const eval_ = minimax(move.board, depth - 1, alpha, beta, true, botColor);
      minEval = Math.min(minEval, eval_);
      beta = Math.min(beta, eval_);
      if (beta <= alpha) break; // Alpha cutoff
    }
    return minEval;
  }
};

/**
 * Get best move for bot player
 */
export const getBestMove = (board, botColor = 'black') => {
  const legalMoves = getAllLegalMoves(board, botColor);
  if (legalMoves.length === 0) {
    return null;
  }

  let bestMove = null;
  let bestScore = -Infinity;

  // Shuffle slightly so games have variety among equally good moves
  const shuffled = [...legalMoves].sort(() => Math.random() - 0.5);

  for (let move of shuffled) {
    const score = minimax(
      move.board,
      MAX_DEPTH - 1,
      -Infinity,
      Infinity,
      false, // Next turn is minimizing (human)
      botColor
    );

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
};

