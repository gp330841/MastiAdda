import React, { useState, useEffect, useCallback } from 'react';
import './TwentyFortyEight.css';
import {
  initBoard,
  addRandomTile,
  moveLeft,
  moveRight,
  moveUp,
  moveDown,
  hasWon,
  hasLost,
  getTileColor,
  getTextColor,
} from '../utils/2048Logic.js';
import {
  playMoveSound,
  playMergeSound,
  playWinSound,
  playLoseSound,
} from '../utils/gameAudio.js';

const TwentyFortyEight = ({ onBack }) => {
  const [board, setBoard] = useState(() => initBoard());
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => {
    return parseInt(localStorage.getItem('2048_best_score') || '0', 10);
  });
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [hasDismissedWin, setHasDismissedWin] = useState(false);
  const [history, setHistory] = useState([]);
  const [touchStart, setTouchStart] = useState(null);

  const handleMove = useCallback((direction) => {
    if (gameOver || won) return;

    let moveResult = null;

    switch (direction) {
      case 'left':
        moveResult = moveLeft(board);
        break;
      case 'right':
        moveResult = moveRight(board);
        break;
      case 'up':
        moveResult = moveUp(board);
        break;
      case 'down':
        moveResult = moveDown(board);
        break;
      default:
        return;
    }

    if (moveResult && moveResult.moved) {
      // Save current board for undo before mutating
      setHistory((prev) => [...prev, { board: [...board], score }]);

      const newBoard = [...moveResult.board];
      addRandomTile(newBoard);

      const newScore = score + moveResult.score;
      if (moveResult.score > 0) {
        playMergeSound();
      } else {
        playMoveSound();
      }

      setScore(newScore);
      setBoard(newBoard);

      if (newScore > bestScore) {
        setBestScore(newScore);
        localStorage.setItem('2048_best_score', newScore.toString());
      }

      if (!hasDismissedWin && !won && hasWon(newBoard)) {
        setWon(true);
        playWinSound();
      }

      if (hasLost(newBoard)) {
        setGameOver(true);
        playLoseSound();
      }
    }
  }, [board, gameOver, score, bestScore, hasDismissedWin, won]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameOver || won) return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          handleMove('left');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          handleMove('right');
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          handleMove('up');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          handleMove('down');
          break;
        default:
          return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleMove, gameOver, won]);

  const handleTouchStart = (e) => {
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    });
  };

  const handleTouchEnd = (e) => {
    if (!touchStart) return;

    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY,
    };

    const deltaX = touchEnd.x - touchStart.x;
    const deltaY = touchEnd.y - touchStart.y;
    const threshold = 30;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > threshold) {
        handleMove('right');
      } else if (deltaX < -threshold) {
        handleMove('left');
      }
    } else {
      if (deltaY > threshold) {
        handleMove('down');
      } else if (deltaY < -threshold) {
        handleMove('up');
      }
    }

    setTouchStart(null);
  };

  const handleUndo = () => {
    if (history.length > 0) {
      const previousState = history[history.length - 1];
      setBoard(previousState.board);
      setScore(previousState.score);
      setHistory(history.slice(0, -1));
      setGameOver(false);
      setWon(false);
      playMoveSound();
    }
  };

  const handleNewGame = () => {
    const newBoard = initBoard();
    setBoard(newBoard);
    setScore(0);
    setGameOver(false);
    setWon(false);
    setHasDismissedWin(false);
    setHistory([]);
  };

  const handleContinue = () => {
    setWon(false);
    setHasDismissedWin(true);
  };

  const getTileFontSizeClass = (val) => {
    if (val >= 10000) return 'tile-xsmall';
    if (val >= 1024) return 'tile-small';
    if (val >= 128) return 'tile-medium';
    return '';
  };

  return (
    <div className="game-2048 animate-fade-in">
      <div className="game-header-2048">
        <button className="btn-back" onClick={onBack}>← Back</button>
        <h1>2048</h1>
        <div className="spacer"></div>
      </div>

      <div className="game-info-2048">
        <div className="score-container-2048">
          <div className="score-box-2048">
            <p className="score-label-2048">Score</p>
            <p className="score-value-2048">{score}</p>
          </div>
          <div className="score-box-2048">
            <p className="score-label-2048">Best</p>
            <p className="score-value-2048">{bestScore}</p>
          </div>
        </div>
        <button className="btn-new-game-2048" onClick={handleNewGame}>
          New Game
        </button>
      </div>

      <div
        className="board-2048"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        role="region"
        aria-label={`2048 board. Score ${score}. Use the arrow keys, WASD, swipe, or the direction buttons to move tiles.`}
      >
        {board.map((value, idx) => (
          <div
            key={idx}
            className={`tile-2048 ${value > 0 ? 'has-value' : ''} ${getTileFontSizeClass(value)}`}
            style={
              value > 0
                ? {
                    backgroundColor: getTileColor(value),
                    color: getTextColor(value),
                  }
                : {}
            }
          >
            {value > 0 && <span>{value}</span>}
          </div>
        ))}
      </div>

      {/* On-screen Directional D-Pad */}
      <div className="dpad-controls-2048">
        <div className="dpad-row-2048">
          <button className="btn-dpad-2048" onClick={() => handleMove('up')} aria-label="Up">
            ▲
          </button>
        </div>
        <div className="dpad-row-2048 middle">
          <button className="btn-dpad-2048" onClick={() => handleMove('left')} aria-label="Left">
            ◀
          </button>
          <button className="btn-dpad-2048" onClick={() => handleMove('down')} aria-label="Down">
            ▼
          </button>
          <button className="btn-dpad-2048" onClick={() => handleMove('right')} aria-label="Right">
            ▶
          </button>
        </div>
      </div>

      <div className="controls-2048">
        <button
          className="btn-undo-2048"
          onClick={handleUndo}
          disabled={history.length === 0}
        >
          ↶ Undo Move
        </button>
        <p className="hint-2048">Use arrow keys, WASD, swipe, or on-screen buttons</p>
      </div>

      {gameOver && (
        <div className="modal-overlay-2048">
          <div className="modal-2048">
            <h2>Game Over! 💥</h2>
            <p>Final Score: <strong>{score}</strong></p>
            <button className="btn-primary-2048" onClick={handleNewGame}>
              Play Again
            </button>
          </div>
        </div>
      )}

      {won && (
        <div className="modal-overlay-2048">
          <div className="modal-2048 success">
            <h2>🎉 You Won!</h2>
            <p>You reached 2048! Current Score: <strong>{score}</strong></p>
            <div className="modal-buttons-2048">
              <button className="btn-primary-2048" onClick={handleContinue}>
                Keep Playing
              </button>
              <button className="btn-secondary-2048" onClick={handleNewGame}>
                New Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TwentyFortyEight;
