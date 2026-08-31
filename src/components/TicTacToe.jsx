import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './TicTacToe.css';
import { playMoveSound, playWinSound, playDrawSound } from '../utils/gameAudio.js';

const WINNING_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6]             // diagonals
];

const TicTacToe = ({ onBack }) => {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [gameMode, setGameMode] = useState('1p');
  const [scores, setScores] = useState({ X: 0, O: 0, ties: 0 });

  const checkWinner = useCallback((squares) => {
    for (let i = 0; i < WINNING_COMBOS.length; i++) {
      const [a, b, c] = WINNING_COMBOS[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return { player: squares[a], line: [a, b, c] };
      }
    }
    return null;
  }, []);

  const winner = useMemo(() => checkWinner(board), [board, checkWinner]);
  const isDraw = !winner && board.every(Boolean);

  const handlePlay = (index) => {
    if (board[index] || winner || (gameMode === '1p' && !isXNext)) return;

    const newBoard = [...board];
    const nextPlayer = isXNext ? 'X' : 'O';
    newBoard[index] = nextPlayer;
    playMoveSound();

    const nextWinner = checkWinner(newBoard);
    if (nextWinner) {
      setScores((s) => ({ ...s, [nextWinner.player]: s[nextWinner.player] + 1 }));
      playWinSound();
    } else if (newBoard.every(Boolean)) {
      setScores((s) => ({ ...s, ties: s.ties + 1 }));
      playDrawSound();
    }

    setBoard(newBoard);
    setIsXNext(!isXNext);
  };

  useEffect(() => {
    if (gameMode !== '1p' || isXNext || winner || isDraw) {
      return undefined;
    }

    const timer = setTimeout(() => {
      const available = board.map((val, idx) => (val === null ? idx : null)).filter((val) => val !== null);
      if (available.length === 0 || winner) return;

      const findWinningMove = (player) => {
        for (let idx of available) {
          const tempBoard = [...board];
          tempBoard[idx] = player;
          if (checkWinner(tempBoard)) return idx;
        }
        return null;
      };

      let move = findWinningMove('O');
      if (move === null) move = findWinningMove('X');
      if (move === null && available.includes(4)) move = 4;
      if (move === null) {
        const corners = [0, 2, 6, 8].filter((c) => available.includes(c));
        if (corners.length > 0 && Math.random() < 0.7) {
          move = corners[Math.floor(Math.random() * corners.length)];
        } else {
          const randomIdx = Math.floor(Math.random() * available.length);
          move = available[randomIdx];
        }
      }

      const newBoard = [...board];
      newBoard[move] = 'O';
      playMoveSound();

      const nextWinner = checkWinner(newBoard);
      if (nextWinner) {
        setScores((s) => ({ ...s, [nextWinner.player]: s[nextWinner.player] + 1 }));
        playWinSound();
      } else if (newBoard.every(Boolean)) {
        setScores((s) => ({ ...s, ties: s.ties + 1 }));
        playDrawSound();
      }

      setBoard(newBoard);
      setIsXNext(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [board, checkWinner, gameMode, isDraw, isXNext, winner]);

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
  };

  const resetScores = () => {
    resetGame();
    setScores({ X: 0, O: 0, ties: 0 });
  };

  const renderCell = (i) => {
    const isWinningCell = winner && winner.line.includes(i);
    return (
      <button 
        key={i}
        className={`ttt-cell ${board[i] ? 'filled' : ''} ${board[i] === 'X' ? 'cell-x' : 'cell-o'} ${isWinningCell ? 'winning-cell' : ''}`}
        onClick={() => handlePlay(i)}
        disabled={!!winner || !!board[i] || (gameMode === '1p' && !isXNext)}
        aria-label={`Square ${i + 1}: ${board[i] || 'Empty'}`}
      >
        {board[i]}
      </button>
    );
  };

  return (
    <div className="tictactoe-container animate-fade-in">
      <header className="tictactoe-header">
        <button className="btn-outline back-btn" onClick={onBack}>
          ← Back
        </button>
        <h2 className="tictactoe-title">Tic Tac Toe</h2>
        <div className="ttt-mode-selector">
          <button 
            className={`ttt-mode-btn ${gameMode === '1p' ? 'active' : ''}`} 
            onClick={() => { setGameMode('1p'); resetGame(); }}
          >
            1 Player
          </button>
          <button 
            className={`ttt-mode-btn ${gameMode === '2p' ? 'active' : ''}`} 
            onClick={() => { setGameMode('2p'); resetGame(); }}
          >
            2 Player
          </button>
        </div>
      </header>

      <div className="tictactoe-content glass-panel">
        <div className="ttt-scoreboard">
          <div className={`ttt-score-badge ${isXNext && !winner ? 'active' : ''} x-score`}>
            <span className="ttt-player-label">Player X</span>
            <span className="ttt-score-value">{scores.X}</span>
          </div>
          
          <div className="ttt-status-display">
            {winner ? (
              <div className="ttt-winner-announcement">Player {winner.player} Wins! 🎉</div>
            ) : isDraw ? (
              <div className="ttt-winner-announcement draw">It&apos;s a Draw! 🤝</div>
            ) : (
              <div className="ttt-turn-indicator">
                {gameMode === '1p' && !isXNext ? '🤖 Bot is thinking...' : `Player ${isXNext ? 'X' : 'O'}'s Turn`}
              </div>
            )}
          </div>
          
          <div className={`ttt-score-badge ${!isXNext && !winner ? 'active' : ''} o-score`}>
            <span className="ttt-player-label">{gameMode === '1p' ? 'Bot O' : 'Player O'}</span>
            <span className="ttt-score-value">{scores.O}</span>
          </div>
        </div>

        <div className="ttt-board-wrapper">
          <div className="ttt-board">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => renderCell(i))}
          </div>
        </div>

        <div className="ttt-controls">
          <button className="btn-primary" onClick={resetGame}>
            New Round
          </button>
          <button className="btn-outline" onClick={resetScores}>
            Reset Score
          </button>
        </div>
      </div>
    </div>
  );
};

export default TicTacToe;
