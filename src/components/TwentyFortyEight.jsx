import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  isMasterSoundEnabled,
  setMasterSoundEnabled,
  playClickSound,
} from '../utils/gameAudio.js';
import { getGameScore, saveGameScore, subscribeToScores } from '../utils/scoreSync.js';

const ACTIVE_GAME_KEY = 'omni_2048_active_game';

const TwentyFortyEight = ({ onBack }) => {
  const [savedGame] = useState(() => {
    try {
      const data = localStorage.getItem(ACTIVE_GAME_KEY);
      if (!data) return null;
      const parsed = JSON.parse(data);
      if (parsed && Array.isArray(parsed.board) && parsed.board.length === 16) {
        return parsed;
      }
      return null;
    } catch (error) {
      void error;
      return null;
    }
  });

  const [board, setBoard] = useState(() => savedGame?.board || initBoard());
  const [score, setScore] = useState(() => (typeof savedGame?.score === 'number' ? savedGame.score : 0));
  const [soundEnabled, setSoundEnabled] = useState(() => isMasterSoundEnabled());
  const [bestScore, setBestScore] = useState(() => {
    const local = parseInt(localStorage.getItem('2048_best_score') || '0', 10);
    const remote = getGameScore('2048')?.highScore || 0;
    return Math.max(local, remote, typeof savedGame?.score === 'number' ? savedGame.score : 0);
  });
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(() => savedGame?.won || false);
  const [hasDismissedWin, setHasDismissedWin] = useState(() => savedGame?.hasDismissedWin || false);
  const [history, setHistory] = useState(() => savedGame?.history || []);
  const syncTimerRef = useRef(null);
  const boardRef = useRef(null);

  // Reconcile and persist in-progress game so navigating away retains board
  useEffect(() => {
    if (gameOver) {
      localStorage.removeItem(ACTIVE_GAME_KEY);
      return;
    }
    try {
      localStorage.setItem(
        ACTIVE_GAME_KEY,
        JSON.stringify({
          board,
          score,
          won,
          hasDismissedWin,
          history,
          savedAt: Date.now(),
        })
      );
    } catch (error) {
      void error;
    }
  }, [board, score, gameOver, won, hasDismissedWin, history]);

  // Immediately reconcile local high score with cloud on mount
  useEffect(() => {
    const local = parseInt(localStorage.getItem('2048_best_score') || '0', 10);
    const remote = getGameScore('2048')?.highScore || 0;
    const effective = Math.max(local, remote);
    if (effective > 0) {
      localStorage.setItem('2048_best_score', effective.toString());
      saveGameScore('2048', { highScore: effective });
    }
  }, []);

  // Subscribe to live multi-session score updates across devices
  useEffect(() => {
    const unsub = subscribeToScores((allScores) => {
      const saved = allScores['2048'];
      if (saved && saved.highScore > 0) {
        setBestScore((curr) => {
          const next = Math.max(curr, saved.highScore);
          localStorage.setItem('2048_best_score', next.toString());
          return next;
        });
      }
    });
    return unsub;
  }, []);

  // Debounced cloud push to prevent network spam during rapid mobile swipes
  const persistHighScore = useCallback((high) => {
    setBestScore(high);
    localStorage.setItem('2048_best_score', high.toString());

    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
    }
    syncTimerRef.current = setTimeout(() => {
      saveGameScore('2048', { highScore: high });
    }, 350);
  }, []);

  // Guaranteed flush on visibility change, pagehide, and unmount
  useEffect(() => {
    const flushScore = () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
      const current = parseInt(localStorage.getItem('2048_best_score') || '0', 10);
      if (current > 0) {
        saveGameScore('2048', { highScore: current });
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') flushScore();
    };

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', flushScore);
    window.addEventListener('beforeunload', flushScore);

    return () => {
      flushScore();
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', flushScore);
      window.removeEventListener('beforeunload', flushScore);
    };
  }, []);

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
        persistHighScore(newScore);
      }

      if (!hasDismissedWin && !won && hasWon(newBoard)) {
        setWon(true);
        playWinSound();
        const finalBest = Math.max(bestScore, newScore);
        if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
        saveGameScore('2048', { highScore: finalBest });
      }

      if (hasLost(newBoard)) {
        setGameOver(true);
        playLoseSound();
        const finalBest = Math.max(bestScore, newScore);
        if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
        saveGameScore('2048', { highScore: finalBest });
      }
    }
  }, [board, gameOver, score, bestScore, hasDismissedWin, won, persistHighScore]);

  const handleUndo = useCallback(() => {
    if (history.length > 0) {
      const previousState = history[history.length - 1];
      setBoard(previousState.board);
      setScore(previousState.score);
      setHistory(history.slice(0, -1));
      setGameOver(false);
      setWon(false);
      playMoveSound();
    }
  }, [history]);

  const handleNewGame = useCallback(() => {
    playClickSound();
    localStorage.removeItem(ACTIVE_GAME_KEY);
    const newBoard = initBoard();
    setBoard(newBoard);
    setScore(0);
    setGameOver(false);
    setWon(false);
    setHasDismissedWin(false);
    setHistory([]);
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setMasterSoundEnabled(next);
    if (next) playClickSound();
  };

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
        case 'u':
        case 'U':
        case 'z':
        case 'Z':
          e.preventDefault();
          handleUndo();
          break;
        case 'n':
        case 'N':
          e.preventDefault();
          handleNewGame();
          break;
        default:
          return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleMove, handleUndo, handleNewGame, gameOver, won]);

  useEffect(() => {
    const boardEl = boardRef.current;
    if (!boardEl) return;

    let startX = 0;
    let startY = 0;
    let isSwiping = false;

    const handleTouchStart = (e) => {
      if (gameOver || won) return;
      if (!e.touches || e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isSwiping = true;
    };

    const handleTouchMove = (e) => {
      if (!isSwiping) return;
      // Crucial: prevent window scrolling, pull-to-refresh, and viewport bounce while swiping on the game board
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = (e) => {
      if (!isSwiping) return;
      isSwiping = false;

      if (!e.changedTouches || e.changedTouches.length === 0) return;
      if (e.cancelable) {
        e.preventDefault();
      }

      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const deltaX = endX - startX;
      const deltaY = endY - startY;
      const threshold = 25;

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (Math.abs(deltaX) > threshold) {
          if (deltaX > 0) {
            handleMove('right');
          } else {
            handleMove('left');
          }
        }
      } else {
        if (Math.abs(deltaY) > threshold) {
          if (deltaY > 0) {
            handleMove('down');
          } else {
            handleMove('up');
          }
        }
      }
    };

    const handleTouchCancel = () => {
      isSwiping = false;
    };

    // Mouse drag support for testing swipe gestures in desktop browser simulator
    let mouseStartX = 0;
    let mouseStartY = 0;
    let isMouseDown = false;

    const handleMouseDown = (e) => {
      if (gameOver || won || e.button !== 0) return;
      mouseStartX = e.clientX;
      mouseStartY = e.clientY;
      isMouseDown = true;
    };

    const handleMouseUp = (e) => {
      if (!isMouseDown) return;
      isMouseDown = false;

      const deltaX = e.clientX - mouseStartX;
      const deltaY = e.clientY - mouseStartY;
      const threshold = 25;

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (Math.abs(deltaX) > threshold) {
          if (deltaX > 0) handleMove('right');
          else handleMove('left');
        }
      } else {
        if (Math.abs(deltaY) > threshold) {
          if (deltaY > 0) handleMove('down');
          else handleMove('up');
        }
      }
    };

    const handleMouseLeave = () => {
      isMouseDown = false;
    };

    boardEl.addEventListener('touchstart', handleTouchStart, { passive: true });
    boardEl.addEventListener('touchmove', handleTouchMove, { passive: false });
    boardEl.addEventListener('touchend', handleTouchEnd, { passive: false });
    boardEl.addEventListener('touchcancel', handleTouchCancel, { passive: true });
    boardEl.addEventListener('mousedown', handleMouseDown);
    boardEl.addEventListener('mouseup', handleMouseUp);
    boardEl.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      boardEl.removeEventListener('touchstart', handleTouchStart);
      boardEl.removeEventListener('touchmove', handleTouchMove);
      boardEl.removeEventListener('touchend', handleTouchEnd);
      boardEl.removeEventListener('touchcancel', handleTouchCancel);
      boardEl.removeEventListener('mousedown', handleMouseDown);
      boardEl.removeEventListener('mouseup', handleMouseUp);
      boardEl.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [handleMove, gameOver, won]);

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
        <button
          type="button"
          className="btn-back"
          onClick={() => {
            if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
            const current = parseInt(localStorage.getItem('2048_best_score') || '0', 10);
            if (current > 0) saveGameScore('2048', { highScore: current });
            onBack();
          }}
        >
          ← Back
        </button>
        <h1>2048</h1>
        <div className="header-actions">
          <button
            type="button"
            className="btn-outline btn-sound-game"
            onClick={toggleSound}
            aria-label={soundEnabled ? 'Mute audio' : 'Unmute audio'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>
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
        ref={boardRef}
        className="board-2048"
        role="region"
        aria-label={`2048 board. Score ${score}. Use the arrow keys, WASD, swipe, or the direction buttons to move tiles.`}
      >
        {board.map((value, idx) => (
          <div
            key={idx}
            className={`tile-2048 ${value > 0 ? 'has-value' : ''} ${getTileFontSizeClass(value)} ${value >= 1024 ? 'tile-gold' : ''}`}
            aria-label={value > 0 ? `Tile ${value}` : 'Empty tile'}
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
