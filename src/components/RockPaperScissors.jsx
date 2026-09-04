import React, { useEffect, useRef, useState, useCallback } from 'react';
import './RockPaperScissors.css';
import { getRPSWinner, getBotChoice, getChoiceEmoji, CHOICES } from '../utils/rpsLogic';
import {
  playMoveSound,
  playWinSound,
  playLoseSound,
  playDrawSound,
  playCountdownTick,
  isMasterSoundEnabled,
  setMasterSoundEnabled,
  playClickSound,
} from '../utils/gameAudio';
import { getGameScore, saveGameScore, subscribeToScores } from '../utils/scoreSync';

const COUNTDOWN_STEPS = ['Rock...', 'Paper...', 'Scissors...', 'SHOOT!'];

const RockPaperScissors = ({ onBack }) => {
  const [gameMode, setGameMode] = useState(null); // '1p' or '2p'
  const [player1Choice, setPlayer1Choice] = useState(null);
  const [player2Choice, setPlayer2Choice] = useState(null);
  const [result, setResult] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(() => isMasterSoundEnabled());
  const [scores, setScores] = useState(() => {
    const saved = getGameScore('rockpaperscissors');
    return {
      player1: saved.stats?.player1 || 0,
      player2: saved.stats?.player2 || 0,
      ties: saved.stats?.ties || 0,
    };
  });
  const [playerHistory, setPlayerHistory] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [isBattling, setIsBattling] = useState(false);
  const [countdownText, setCountdownText] = useState('');
  const countdownRef = useRef(null);

  useEffect(() => () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  // Multi-session score synchronization
  useEffect(() => {
    const unsub = subscribeToScores((allScores) => {
      const saved = allScores['rockpaperscissors'];
      if (saved && saved.stats) {
        setScores({
          player1: saved.stats.player1 || 0,
          player2: saved.stats.player2 || 0,
          ties: saved.stats.ties || 0,
        });
      }
    });
    return unsub;
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setMasterSoundEnabled(next);
    if (next) playClickSound();
  };

  const triggerBattle = useCallback((p1, p2) => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setIsBattling(true);
    let step = 0;

    countdownRef.current = setInterval(() => {
      if (step < COUNTDOWN_STEPS.length) {
        setCountdownText(COUNTDOWN_STEPS[step]);
        playCountdownTick();
        step++;
      } else {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
        setIsBattling(false);
        setCountdownText('');
        const winner = getRPSWinner(p1, p2);
        setResult(winner);

        setScores((prev) => {
          const nextScores = {
            player1: winner === 'player' ? prev.player1 + 1 : prev.player1,
            player2: winner === 'bot' ? prev.player2 + 1 : prev.player2,
            ties: winner === 'draw' ? prev.ties + 1 : prev.ties,
          };

          // Save & sync to Cloudflare D1
          saveGameScore('rockpaperscissors', {
            highScore: nextScores.player1,
            stats: nextScores,
          });

          return nextScores;
        });

        if (winner === 'player') {
          playWinSound();
        } else if (winner === 'bot') {
          if (gameMode === '1p') {
            playLoseSound();
          } else {
            playWinSound();
          }
        } else {
          playDrawSound();
        }
      }
    }, 320);
  }, [gameMode]);

  const playRound = useCallback((choice) => {
    if (!gameMode || isBattling) return;

    // 2-player mode: Player 1 chooses secretly, then Player 2 chooses
    if (gameMode === '2p') {
      if (currentPlayer === 1) {
        setPlayer1Choice(choice);
        setCurrentPlayer(2);
        playMoveSound();
        return;
      } else {
        playMoveSound();
        const p1 = player1Choice;
        const p2 = choice;
        setPlayer2Choice(p2);
        triggerBattle(p1, p2);
        return;
      }
    }

    // 1-player mode: Player chooses, then Computer chooses with countdown
    playMoveSound();
    const botMove = getBotChoice(playerHistory);
    setPlayer1Choice(choice);
    setPlayer2Choice(botMove);
    setPlayerHistory((prev) => [...prev, choice]);
    triggerBattle(choice, botMove);
  }, [currentPlayer, gameMode, isBattling, player1Choice, playerHistory, triggerBattle]);

  const resetRound = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setPlayer1Choice(null);
    setPlayer2Choice(null);
    setResult(null);
    setCurrentPlayer(1);
    setIsBattling(false);
    setCountdownText('');
  }, []);

  const handleStartGame = (mode) => {
    playClickSound();
    setGameMode(mode);
    resetRound();
  };

  const handleNewGame = () => {
    playClickSound();
    setGameMode(null);
    resetRound();
  };

  const handleResetScores = () => {
    playClickSound();
    setScores({ player1: 0, player2: 0, ties: 0 });
    setPlayerHistory([]);
    resetRound();
    saveGameScore('rockpaperscissors', {
      highScore: 0,
      stats: { player1: 0, player2: 0, ties: 0 },
    });
  };

  // Keyboard controls for rapid gameplay
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!gameMode || isBattling) return;

      if (result) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          resetRound();
        }
        return;
      }

      switch (e.key) {
        case '1':
        case 'r':
        case 'R':
          e.preventDefault();
          playRound('rock');
          break;
        case '2':
        case 'p':
        case 'P':
          e.preventDefault();
          playRound('paper');
          break;
        case '3':
        case 's':
        case 'S':
          e.preventDefault();
          playRound('scissors');
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameMode, isBattling, playRound, resetRound, result]);

  if (!gameMode) {
    return (
      <div className="rps-container animate-fade-in">
        <div className="rps-header">
          <button className="btn-back" onClick={onBack}>← Back</button>
          <h1>Rock, Paper, Scissors</h1>
          <div className="spacer"></div>
        </div>

        <div className="mode-selector">
          <h2>Select Game Mode</h2>
          <div className="mode-buttons">
            <button 
              className="btn-mode"
              onClick={() => handleStartGame('1p')}
            >
              <span className="mode-icon">🤖</span>
              <span>vs Computer</span>
            </button>
            <button 
              className="btn-mode"
              onClick={() => handleStartGame('2p')}
            >
              <span className="mode-icon">👥</span>
              <span>2 Players</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const p1Label = gameMode === '1p' ? 'You' : 'Player 1';
  const p2Label = gameMode === '1p' ? 'Computer' : 'Player 2';

  const getResultAnnouncement = () => {
    if (result === 'draw') return "🤝 It's a Draw!";
    if (gameMode === '1p') {
      return result === 'player' ? '🎉 You Win!' : '😔 Computer Wins!';
    }
    return result === 'player' ? '🎉 Player 1 Wins!' : '🎉 Player 2 Wins!';
  };

  return (
    <div className="rps-container animate-fade-in">
      <div className="rps-header">
        <button className="btn-back" onClick={onBack}>← Back</button>
        <h1>Rock, Paper, Scissors</h1>
        <div className="header-actions">
          <button
            type="button"
            className="btn-outline btn-sound-game"
            onClick={toggleSound}
            aria-label={soundEnabled ? 'Mute audio' : 'Unmute audio'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
          <button className="btn-menu" onClick={resetRound}>Round</button>
          <button className="btn-outline" onClick={handleResetScores} title="Reset win/loss record">Reset</button>
          <button className="btn-outline" onClick={handleNewGame}>Mode</button>
        </div>
      </div>

      <div className="rps-content">
        <div className="rps-scores">
          <div className="score-box p1-box">
            <p className="score-label">{p1Label}</p>
            <p className="score-value">{scores.player1}</p>
          </div>
          <div className="ties-box">
            <span className="score-label">Ties</span>
            <span className="ties-value">{scores.ties}</span>
          </div>
          <div className="score-box p2-box">
            <p className="score-label">{p2Label}</p>
            <p className="score-value">{scores.player2}</p>
          </div>
        </div>

        {gameMode === '2p' && !result && !isBattling && (
          <div className="phase-info" aria-live="polite">
            {currentPlayer === 1 ? (
              <p className="turn-indicator">🎮 Player 1: Pick your move (secretly!)</p>
            ) : (
              <div>
                <p>🔒 Player 1 has picked!</p>
                <p className="turn-indicator">🎮 Player 2: Pick your move!</p>
              </div>
            )}
          </div>
        )}

        <div className="rps-game">
          {isBattling && (
            <div className="countdown-box animate-pulse" aria-live="assertive">
              <div className="countdown-hands">
                <span className="hand-left">✊</span>
                <span className="hand-right">✊</span>
              </div>
              <h2 className="countdown-text">{countdownText}</h2>
            </div>
          )}

          {!isBattling && result && (
            <div className="result-display animate-fade-in" aria-live="polite">
              <div className="choice-reveal">
                <div className="choice-box">
                  <span className="choice-owner">{p1Label}</span>
                  <div className="choice-emoji">{getChoiceEmoji(player1Choice)}</div>
                  <p>{player1Choice}</p>
                </div>
                <div className={`result-text ${result}`}>
                  {getResultAnnouncement()}
                </div>
                <div className="choice-box">
                  <span className="choice-owner">{p2Label}</span>
                  <div className="choice-emoji">{getChoiceEmoji(player2Choice)}</div>
                  <p>{player2Choice}</p>
                </div>
              </div>
              <button className="btn-next-round btn-primary" onClick={resetRound}>
                Next Round
              </button>
            </div>
          )}

          {!isBattling && !result && (
            <div className="choices-wrapper">
              <div className="choices-grid">
                {CHOICES.map((choice, idx) => (
                  <button
                    key={choice}
                    className="choice-button"
                    onClick={() => playRound(choice)}
                    aria-label={`Choose ${choice} (Key: ${idx + 1})`}
                  >
                    <span className="choice-emoji">{getChoiceEmoji(choice)}</span>
                    <span className="choice-label">{choice}</span>
                    <span className="choice-key-hint">[{idx + 1}]</span>
                  </button>
                ))}
              </div>
              <p className="rps-keyboard-hint">Quick play keys: 1 (Rock) · 2 (Paper) · 3 (Scissors)</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RockPaperScissors;
