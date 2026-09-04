import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './TicTacToe.css';
import {
  checkWinner,
  isBoardFull,
  getBestBotMove,
} from '../utils/tictactoeLogic.js';
import {
  playMoveSound,
  playWinSound,
  playDrawSound,
  isMasterSoundEnabled,
  setMasterSoundEnabled,
  playClickSound,
} from '../utils/gameAudio.js';
import { getGameScore, saveGameScore, subscribeToScores } from '../utils/scoreSync.js';

const TicTacToe = ({ onBack }) => {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [gameMode, setGameMode] = useState('1p');
  const [soundEnabled, setSoundEnabled] = useState(() => isMasterSoundEnabled());
  const [scores, setScores] = useState(() => {
    const saved = getGameScore('tictactoe');
    return {
      X: saved.stats?.wins || 0,
      O: saved.stats?.losses || 0,
      ties: saved.stats?.ties || 0,
    };
  });

  const cellRefs = useRef([]);

  // Subscribe to multi-session synced scores
  useEffect(() => {
    const unsub = subscribeToScores((allScores) => {
      const ttt = allScores['tictactoe'];
      if (ttt && ttt.stats) {
        setScores({
          X: ttt.stats.wins || 0,
          O: ttt.stats.losses || 0,
          ties: ttt.stats.ties || 0,
        });
      }
    });
    return unsub;
  }, []);

  const winner = useMemo(() => checkWinner(board), [board]);
  const isDraw = !winner && isBoardFull(board);

  const handleScoreUpdate = useCallback((newWinner, isTie) => {
    setScores((prev) => {
      const nextScores = {
        X: newWinner?.player === 'X' ? prev.X + 1 : prev.X,
        O: newWinner?.player === 'O' ? prev.O + 1 : prev.O,
        ties: isTie ? prev.ties + 1 : prev.ties,
      };

      // Persist & sync to Cloudflare D1 across sessions
      saveGameScore('tictactoe', {
        highScore: nextScores.X,
        stats: {
          wins: nextScores.X,
          losses: nextScores.O,
          ties: nextScores.ties,
        },
      });

      return nextScores;
    });
  }, []);

  const handlePlay = useCallback((index) => {
    if (board[index] || winner || (gameMode === '1p' && !isXNext)) return;

    const newBoard = [...board];
    const nextPlayer = isXNext ? 'X' : 'O';
    newBoard[index] = nextPlayer;
    playMoveSound();

    const nextWinner = checkWinner(newBoard);
    const nextIsDraw = !nextWinner && isBoardFull(newBoard);

    if (nextWinner) {
      handleScoreUpdate(nextWinner, false);
      playWinSound();
    } else if (nextIsDraw) {
      handleScoreUpdate(null, true);
      playDrawSound();
    }

    setBoard(newBoard);
    setIsXNext(!isXNext);
  }, [board, gameMode, handleScoreUpdate, isXNext, winner]);

  // Bot move logic in 1P mode
  useEffect(() => {
    if (gameMode !== '1p' || isXNext || winner || isDraw) {
      return undefined;
    }

    const timer = setTimeout(() => {
      const move = getBestBotMove(board);
      if (move === null || winner) return;

      const newBoard = [...board];
      newBoard[move] = 'O';
      playMoveSound();

      const nextWinner = checkWinner(newBoard);
      const nextIsDraw = !nextWinner && isBoardFull(newBoard);

      if (nextWinner) {
        handleScoreUpdate(nextWinner, false);
        playWinSound();
      } else if (nextIsDraw) {
        handleScoreUpdate(null, true);
        playDrawSound();
      }

      setBoard(newBoard);
      setIsXNext(true);
    }, 450);

    return () => clearTimeout(timer);
  }, [board, gameMode, handleScoreUpdate, isDraw, isXNext, winner]);

  const resetGame = () => {
    playClickSound();
    setBoard(Array(9).fill(null));
    setIsXNext(true);
  };

  const resetScores = () => {
    playClickSound();
    resetGame();
    setScores({ X: 0, O: 0, ties: 0 });
    saveGameScore('tictactoe', {
      highScore: 0,
      stats: { wins: 0, losses: 0, ties: 0 },
    });
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setMasterSoundEnabled(next);
    if (next) playClickSound();
  };

  // Keyboard navigation across the 3x3 grid
  const handleKeyDown = (e, index) => {
    let targetIndex = null;
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        targetIndex = index >= 3 ? index - 3 : index;
        break;
      case 'ArrowDown':
        e.preventDefault();
        targetIndex = index <= 5 ? index + 3 : index;
        break;
      case 'ArrowLeft':
        e.preventDefault();
        targetIndex = index % 3 !== 0 ? index - 1 : index;
        break;
      case 'ArrowRight':
        e.preventDefault();
        targetIndex = index % 3 !== 2 ? index + 1 : index;
        break;
      default:
        return;
    }

    if (targetIndex !== null && cellRefs.current[targetIndex]) {
      cellRefs.current[targetIndex].focus();
    }
  };

  const renderCell = (i) => {
    const isWinningCell = winner && winner.line.includes(i);
    return (
      <button 
        key={i}
        ref={(el) => { cellRefs.current[i] = el; }}
        className={`ttt-cell ${board[i] ? 'filled' : ''} ${board[i] === 'X' ? 'cell-x' : 'cell-o'} ${isWinningCell ? 'winning-cell' : ''}`}
        onClick={() => handlePlay(i)}
        onKeyDown={(e) => handleKeyDown(e, i)}
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
        <div className="header-actions">
          <div className="ttt-mode-selector">
            <button 
              className={`ttt-mode-btn ${gameMode === '1p' ? 'active' : ''}`} 
              onClick={() => { playClickSound(); setGameMode('1p'); resetGame(); }}
            >
              1P vs Bot
            </button>
            <button 
              className={`ttt-mode-btn ${gameMode === '2p' ? 'active' : ''}`} 
              onClick={() => { playClickSound(); setGameMode('2p'); resetGame(); }}
            >
              2 Player
            </button>
          </div>
          <button
            type="button"
            className="btn-outline btn-sound-game"
            onClick={toggleSound}
            aria-label={soundEnabled ? 'Mute audio' : 'Unmute audio'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>
      </header>

      <div className="tictactoe-content glass-panel">
        <div className="ttt-scoreboard">
          <div className={`ttt-score-badge ${isXNext && !winner ? 'active' : ''} x-score`}>
            <span className="ttt-player-label">Player X</span>
            <span className="ttt-score-value">{scores.X}</span>
          </div>
          
          <div className="ttt-status-display" aria-live="polite" aria-atomic="true">
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
          <div className="ttt-board" role="grid" aria-label="Tic Tac Toe 3x3 board">
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

