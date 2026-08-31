/**
 * 2048 Game Logic
 */

export const BOARD_SIZE = 4;

/**
 * Initialize a new board with 2 random tiles
 */
export const initBoard = () => {
  const board = Array(BOARD_SIZE * BOARD_SIZE).fill(0);
  addRandomTile(board);
  addRandomTile(board);
  return board;
};

/**
 * Add a random tile (2 or 4) to an empty position
 */
export const addRandomTile = (board) => {
  const emptyIndices = board
    .map((val, idx) => val === 0 ? idx : null)
    .filter(idx => idx !== null);

  if (emptyIndices.length === 0) return board;

  const randomIdx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
  const newValue = Math.random() < 0.9 ? 2 : 4;
  board[randomIdx] = newValue;
  
  return board;
};

/**
 * Convert 2D coordinates to 1D index
 */
const getIndex = (row, col) => row * BOARD_SIZE + col;

/**
 * Get a row from board
 */
const getRow = (board, row) => {
  return board.slice(row * BOARD_SIZE, row * BOARD_SIZE + BOARD_SIZE);
};

/**
 * Get a column from board
 */
const getColumn = (board, col) => {
  const column = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    column.push(board[getIndex(row, col)]);
  }
  return column;
};

/**
 * Set a row in board
 */
const setRow = (board, row, newRow) => {
  const newBoard = [...board];
  for (let col = 0; col < BOARD_SIZE; col++) {
    newBoard[getIndex(row, col)] = newRow[col];
  }
  return newBoard;
};

/**
 * Set a column in board
 */
const setColumn = (board, col, newColumn) => {
  const newBoard = [...board];
  for (let row = 0; row < BOARD_SIZE; row++) {
    newBoard[getIndex(row, col)] = newColumn[row];
  }
  return newBoard;
};

/**
 * Move and merge line left
 */
const moveLineLeft = (line) => {
  // Remove zeros
  let nonZero = line.filter(v => v !== 0);
  let merged = [];
  let score = 0;

  for (let i = 0; i < nonZero.length; i++) {
    if (i + 1 < nonZero.length && nonZero[i] === nonZero[i + 1]) {
      const newValue = nonZero[i] * 2;
      merged.push(newValue);
      score += newValue;
      i++; // Skip next element as it's merged
    } else {
      merged.push(nonZero[i]);
    }
  }

  // Pad with zeros to maintain size
  while (merged.length < BOARD_SIZE) {
    merged.push(0);
  }

  return { line: merged, score };
};

/**
 * Move and merge line right
 */
const moveLineRight = (line) => {
  const { line: reversed, score } = moveLineLeft([...line].reverse());
  return { line: reversed.reverse(), score };
};

/**
 * Move left
 */
export const moveLeft = (board) => {
  let newBoard = [...board];
  let totalScore = 0;
  let moved = false;

  for (let row = 0; row < BOARD_SIZE; row++) {
    const currentRow = getRow(newBoard, row);
    const { line: newRow, score } = moveLineLeft(currentRow);
    
    if (!arraysEqual(currentRow, newRow)) {
      moved = true;
    }
    
    totalScore += score;
    newBoard = setRow(newBoard, row, newRow);
  }

  return { board: newBoard, score: totalScore, moved };
};

/**
 * Move right
 */
export const moveRight = (board) => {
  let newBoard = [...board];
  let totalScore = 0;
  let moved = false;

  for (let row = 0; row < BOARD_SIZE; row++) {
    const currentRow = getRow(newBoard, row);
    const { line: newRow, score } = moveLineRight(currentRow);
    
    if (!arraysEqual(currentRow, newRow)) {
      moved = true;
    }
    
    totalScore += score;
    newBoard = setRow(newBoard, row, newRow);
  }

  return { board: newBoard, score: totalScore, moved };
};

/**
 * Move up
 */
export const moveUp = (board) => {
  let newBoard = [...board];
  let totalScore = 0;
  let moved = false;

  for (let col = 0; col < BOARD_SIZE; col++) {
    const currentCol = getColumn(newBoard, col);
    const { line: newCol, score } = moveLineLeft(currentCol);
    
    if (!arraysEqual(currentCol, newCol)) {
      moved = true;
    }
    
    totalScore += score;
    newBoard = setColumn(newBoard, col, newCol);
  }

  return { board: newBoard, score: totalScore, moved };
};

/**
 * Move down
 */
export const moveDown = (board) => {
  let newBoard = [...board];
  let totalScore = 0;
  let moved = false;

  for (let col = 0; col < BOARD_SIZE; col++) {
    const currentCol = getColumn(newBoard, col);
    const { line: newCol, score } = moveLineRight(currentCol);
    
    if (!arraysEqual(currentCol, newCol)) {
      moved = true;
    }
    
    totalScore += score;
    newBoard = setColumn(newBoard, col, newCol);
  }

  return { board: newBoard, score: totalScore, moved };
};

/**
 * Check if any moves are possible
 */
export const canMove = (board) => {
  // Check for empty cells
  if (board.some(cell => cell === 0)) {
    return true;
  }

  // Check for possible merges
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const current = board[getIndex(row, col)];
      
      // Check right neighbor
      if (col < BOARD_SIZE - 1 && current === board[getIndex(row, col + 1)]) {
        return true;
      }
      
      // Check bottom neighbor
      if (row < BOARD_SIZE - 1 && current === board[getIndex(row + 1, col)]) {
        return true;
      }
    }
  }

  return false;
};

/**
 * Check if board has reached 2048
 */
export const hasWon = (board) => {
  return board.some(cell => cell >= 2048);
};

/**
 * Check if board has lost (no moves possible)
 */
export const hasLost = (board) => {
  return !canMove(board);
};

/**
 * Helper to check if two arrays are equal
 */
const arraysEqual = (a, b) => {
  return a.length === b.length && a.every((val, idx) => val === b[idx]);
};

/**
 * Get tile color based on value
 */
export const getTileColor = (value) => {
  const colors = {
    2: '#eee4da',
    4: '#ede0c8',
    8: '#f2b179',
    16: '#f59563',
    32: '#f67c5f',
    64: '#f65e3b',
    128: '#edcf72',
    256: '#edcc61',
    512: '#edc850',
    1024: '#edc53f',
    2048: '#edc22e',
    4096: '#3c3c2f',
    8192: '#3c3c22'
  };
  return colors[value] || '#3c3c22';
};

/**
 * Get text color based on value
 */
export const getTextColor = (value) => {
  return value <= 4 ? '#776e65' : '#f9f6f2';
};
