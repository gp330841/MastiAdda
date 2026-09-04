/**
 * Tic Tac Toe Game Logic & Bot AI
 */

export const WINNING_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],            // diagonals
];

/**
 * Check if there is a winner on the board
 */
export const checkWinner = (squares) => {
  for (let i = 0; i < WINNING_COMBOS.length; i++) {
    const [a, b, c] = WINNING_COMBOS[i];
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return { player: squares[a], line: [a, b, c] };
    }
  }
  return null;
};

/**
 * Check if the board is completely filled
 */
export const isBoardFull = (squares) => {
  return squares.every((square) => square !== null);
};

/**
 * Get all available move indices
 */
export const getAvailableMoves = (squares) => {
  return squares
    .map((val, idx) => (val === null ? idx : null))
    .filter((val) => val !== null);
};

/**
 * Determine the optimal move for Bot ('O')
 */
export const getBestBotMove = (squares) => {
  const available = getAvailableMoves(squares);
  if (available.length === 0) return null;

  const findWinningMove = (player) => {
    for (const idx of available) {
      const tempBoard = [...squares];
      tempBoard[idx] = player;
      if (checkWinner(tempBoard)) return idx;
    }
    return null;
  };

  // 1. If bot can win, take it
  const winMove = findWinningMove('O');
  if (winMove !== null) return winMove;

  // 2. If opponent is about to win, block them
  const blockMove = findWinningMove('X');
  if (blockMove !== null) return blockMove;

  // 3. Take center if free
  if (available.includes(4)) return 4;

  // 4. Take corners
  const corners = [0, 2, 6, 8].filter((c) => available.includes(c));
  if (corners.length > 0) {
    return corners[Math.floor(Math.random() * corners.length)];
  }

  // 5. Fallback to any available square
  return available[Math.floor(Math.random() * available.length)];
};
