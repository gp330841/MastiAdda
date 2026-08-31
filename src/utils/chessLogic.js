/**
 * Chess Game Logic - Board representation and move validation
 */

export const BOARD_SIZE = 8;

// Piece constants
export const PIECES = {
  WHITE: {
    PAWN: 'P',
    ROOK: 'R',
    KNIGHT: 'N',
    BISHOP: 'B',
    QUEEN: 'Q',
    KING: 'K',
  },
  BLACK: {
    PAWN: 'p',
    ROOK: 'r',
    KNIGHT: 'n',
    BISHOP: 'b',
    QUEEN: 'q',
    KING: 'k',
  },
};

// Unicode piece symbols
export const PIECE_SYMBOLS = {
  P: '♙',
  R: '♖',
  N: '♘',
  B: '♗',
  Q: '♕',
  K: '♔',
  p: '♟',
  r: '♜',
  n: '♞',
  b: '♝',
  q: '♛',
  k: '♚',
};

/**
 * Initialize board in standard chess starting position
 */
export const initBoard = () => {
  const board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));

  // Black pieces
  board[0] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  for (let col = 0; col < BOARD_SIZE; col++) {
    board[1][col] = 'p';
  }

  // White pieces
  for (let col = 0; col < BOARD_SIZE; col++) {
    board[6][col] = 'P';
  }
  board[7] = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];

  return board;
};

/**
 * Get piece color (white or black)
 */
export const getPieceColor = (piece) => {
  if (!piece) return null;
  return piece === piece.toUpperCase() ? 'white' : 'black';
};

/**
 * Check if position is within board
 */
export const isValidPosition = (row, col) => {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
};

/**
 * Get squares attacked diagonally by a pawn
 */
export const getPawnAttacks = (board, row, col) => {
  const piece = board[row][col];
  if (!piece) return [];
  const color = getPieceColor(piece);
  const direction = color === 'white' ? -1 : 1;
  const attacks = [];

  for (let colOffset of [-1, 1]) {
    const attackRow = row + direction;
    const attackCol = col + colOffset;
    if (isValidPosition(attackRow, attackCol)) {
      attacks.push({ row: attackRow, col: attackCol });
    }
  }

  return attacks;
};

/**
 * Get valid pawn moves (forward moves + diagonal captures)
 */
const getPawnMoves = (board, row, col) => {
  const piece = board[row][col];
  const color = getPieceColor(piece);
  const moves = [];
  const direction = color === 'white' ? -1 : 1;
  const startRow = color === 'white' ? 6 : 1;

  // Forward 1 step
  const forwardRow = row + direction;
  if (isValidPosition(forwardRow, col) && !board[forwardRow][col]) {
    moves.push({ row: forwardRow, col });

    // Forward 2 steps from starting position
    if (row === startRow) {
      const doubleRow = row + 2 * direction;
      if (!board[doubleRow][col]) {
        moves.push({ row: doubleRow, col });
      }
    }
  }

  // Captures
  for (let colOffset of [-1, 1]) {
    const captureRow = row + direction;
    const captureCol = col + colOffset;
    if (isValidPosition(captureRow, captureCol) && board[captureRow][captureCol]) {
      const targetColor = getPieceColor(board[captureRow][captureCol]);
      if (targetColor !== color) {
        moves.push({ row: captureRow, col: captureCol });
      }
    }
  }

  return moves;
};

/**
 * Get valid knight moves
 */
const getKnightMoves = (board, row, col) => {
  const piece = board[row][col];
  const color = getPieceColor(piece);
  const moves = [];
  const deltas = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1],
  ];

  for (let [dr, dc] of deltas) {
    const newRow = row + dr;
    const newCol = col + dc;
    if (isValidPosition(newRow, newCol)) {
      const target = board[newRow][newCol];
      if (!target || getPieceColor(target) !== color) {
        moves.push({ row: newRow, col: newCol });
      }
    }
  }

  return moves;
};

/**
 * Get straight line moves (rook/queen)
 */
const getStraightMoves = (board, row, col) => {
  const piece = board[row][col];
  const color = getPieceColor(piece);
  const moves = [];
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  for (let [dr, dc] of directions) {
    for (let i = 1; i < BOARD_SIZE; i++) {
      const newRow = row + dr * i;
      const newCol = col + dc * i;
      if (!isValidPosition(newRow, newCol)) break;

      const target = board[newRow][newCol];
      if (!target) {
        moves.push({ row: newRow, col: newCol });
      } else {
        if (getPieceColor(target) !== color) {
          moves.push({ row: newRow, col: newCol });
        }
        break;
      }
    }
  }

  return moves;
};

/**
 * Get diagonal moves (bishop/queen)
 */
const getDiagonalMoves = (board, row, col) => {
  const piece = board[row][col];
  const color = getPieceColor(piece);
  const moves = [];
  const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

  for (let [dr, dc] of directions) {
    for (let i = 1; i < BOARD_SIZE; i++) {
      const newRow = row + dr * i;
      const newCol = col + dc * i;
      if (!isValidPosition(newRow, newCol)) break;

      const target = board[newRow][newCol];
      if (!target) {
        moves.push({ row: newRow, col: newCol });
      } else {
        if (getPieceColor(target) !== color) {
          moves.push({ row: newRow, col: newCol });
        }
        break;
      }
    }
  }

  return moves;
};

/**
 * Get valid king moves
 */
const getKingMoves = (board, row, col) => {
  const piece = board[row][col];
  const color = getPieceColor(piece);
  const moves = [];

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const newRow = row + dr;
      const newCol = col + dc;
      if (isValidPosition(newRow, newCol)) {
        const target = board[newRow][newCol];
        if (!target || getPieceColor(target) !== color) {
          moves.push({ row: newRow, col: newCol });
        }
      }
    }
  }

  return moves;
};

/**
 * Get all raw candidate moves for a piece (without check validation)
 */
export const getValidMoves = (board, row, col) => {
  if (!isValidPosition(row, col) || !board[row][col]) {
    return [];
  }

  const piece = board[row][col].toUpperCase();
  let moves = [];

  switch (piece) {
    case 'P':
      moves = getPawnMoves(board, row, col);
      break;
    case 'N':
      moves = getKnightMoves(board, row, col);
      break;
    case 'B':
      moves = getDiagonalMoves(board, row, col);
      break;
    case 'R':
      moves = getStraightMoves(board, row, col);
      break;
    case 'Q':
      moves = [
        ...getStraightMoves(board, row, col),
        ...getDiagonalMoves(board, row, col),
      ];
      break;
    case 'K':
      moves = getKingMoves(board, row, col);
      break;
    default:
      break;
  }

  return moves;
};

/**
 * Execute a move on the board
 */
export const movePiece = (board, fromRow, fromCol, toRow, toCol) => {
  const newBoard = board.map(row => [...row]);
  const piece = newBoard[fromRow][fromCol];

  if (!piece) return { board: newBoard, captured: null };

  const captured = newBoard[toRow][toCol];
  newBoard[toRow][toCol] = piece;
  newBoard[fromRow][fromCol] = null;

  return { board: newBoard, captured };
};

/**
 * Find king position
 */
export const findKing = (board, color) => {
  const king = color === 'white' ? 'K' : 'k';
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] === king) {
        return { row, col };
      }
    }
  }
  return null;
};

/**
 * Check if a position is under attack by opponent
 */
export const isUnderAttack = (board, row, col, byColor) => {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const piece = board[r][c];
      if (piece && getPieceColor(piece) === byColor) {
        const upper = piece.toUpperCase();

        if (upper === 'P') {
          const attacks = getPawnAttacks(board, r, c);
          if (attacks.some(m => m.row === row && m.col === col)) {
            return true;
          }
        } else if (upper === 'N') {
          const moves = getKnightMoves(board, r, c);
          if (moves.some(m => m.row === row && m.col === col)) {
            return true;
          }
        } else if (upper === 'K') {
          const moves = getKingMoves(board, r, c);
          if (moves.some(m => m.row === row && m.col === col)) {
            return true;
          }
        } else {
          // Sliding pieces (R, B, Q)
          const moves = getValidMoves(board, r, c);
          if (moves.some(m => m.row === row && m.col === col)) {
            return true;
          }
        }
      }
    }
  }
  return false;
};

/**
 * Check if player is in check
 */
export const isInCheck = (board, color) => {
  const kingPos = findKing(board, color);
  if (!kingPos) return false;

  const opponentColor = color === 'white' ? 'black' : 'white';
  return isUnderAttack(board, kingPos.row, kingPos.col, opponentColor);
};

/**
 * Get all fully legal moves for a specific piece (moves that do not leave own king in check)
 */
export const getLegalMovesForPiece = (board, row, col) => {
  const piece = board[row][col];
  if (!piece) return [];
  const color = getPieceColor(piece);
  const candidates = getValidMoves(board, row, col);

  return candidates.filter(move => {
    const { board: testBoard } = movePiece(board, row, col, move.row, move.col);
    return !isInCheck(testBoard, color);
  });
};

/**
 * Check if player has any legal moves
 */
export const hasLegalMoves = (board, color) => {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col];
      if (piece && getPieceColor(piece) === color) {
        const legal = getLegalMovesForPiece(board, row, col);
        if (legal.length > 0) return true;
      }
    }
  }
  return false;
};

/**
 * Check if player is in checkmate
 */
export const isCheckmate = (board, color) => {
  return isInCheck(board, color) && !hasLegalMoves(board, color);
};

/**
 * Check if game is stalemate
 */
export const isStalemate = (board, color) => {
  return !isInCheck(board, color) && !hasLegalMoves(board, color);
};

/**
 * Promote pawn
 */
export const promotePawn = (board, row, col, newPiece) => {
  const newBoard = board.map(r => [...r]);
  newBoard[row][col] = newPiece;
  return newBoard;
};

/**
 * Check if pawn reached promotion rank
 */
export const isPawnPromotion = (piece, toRow) => {
  if (!piece || piece.toUpperCase() !== 'P') return false;
  return (piece === 'P' && toRow === 0) || (piece === 'p' && toRow === 7);
};

/**
 * Get piece value for evaluation
 */
export const getPieceValue = (piece) => {
  if (!piece) return 0;
  const upper = piece.toUpperCase();
  const values = {
    P: 10,
    N: 30,
    B: 30,
    R: 50,
    Q: 90,
    K: 900,
  };
  return values[upper] || 0;
};

