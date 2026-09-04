import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './Ludo.css';
import { getTokenPosition } from '../utils/ludoPositions.js';
import { chooseBestBotMove, getPlayableTokens, isPositionSafe } from '../utils/ludoLogic.js';
import { playLudoSound, setMasterSoundEnabled, isMasterSoundEnabled } from '../utils/gameAudio.js';
import { getGameScore, saveGameScore } from '../utils/scoreSync.js';

const COLORS = ['red', 'green', 'yellow', 'blue'];
const PLAYER_COLOR_MAP = {
  red: '#ef4444',
  green: '#10b981',
  yellow: '#f59e0b',
  blue: '#3b82f6',
};
const DEFAULT_PLAYER_NAMES = {
  red: 'Red',
  green: 'Green',
  yellow: 'Yellow',
  blue: 'Blue',
};

const buildInitialPlayers = () => {
  const initialState = {};
  COLORS.forEach((color) => {
    initialState[color] = Array(4).fill(null).map((_, i) => ({
      id: i,
      status: 'base',
      step: 0,
    }));
  });
  return initialState;
};

const getPlayerDisplayName = (color, playerNames) => {
  const value = playerNames[color]?.trim();
  return value || DEFAULT_PLAYER_NAMES[color];
};

const LUDO_STORAGE_KEY = 'omni_ludo_active_game';

const Ludo = ({ onBack }) => {
  const [savedGame] = useState(() => {
    try {
      const data = localStorage.getItem(LUDO_STORAGE_KEY);
      if (!data) return null;
      const parsed = JSON.parse(data);
      if (parsed && parsed.players && parsed.turn && !parsed.winner) {
        return parsed;
      }
      return null;
    } catch (error) {
      void error;
      return null;
    }
  });

  const [players, setPlayers] = useState(() => savedGame?.players || buildInitialPlayers());
  const [turn, setTurn] = useState(() => savedGame?.turn || 'red');
  const [diceRoll, setDiceRoll] = useState(() => savedGame?.diceRoll || 1);
  const [isRolling, setIsRolling] = useState(false);
  const [message, setMessage] = useState(() => savedGame?.message || 'Red to roll!');
  const [hasRolled, setHasRolled] = useState(() => savedGame?.hasRolled || false);
  const [activePlayers, setActivePlayers] = useState(() => savedGame?.activePlayers || ['red', 'green', 'yellow', 'blue']);
  const [isBot, setIsBot] = useState(() => savedGame?.isBot || {
    red: false,
    green: true,
    yellow: true,
    blue: true,
  });
  const [diceRotation, setDiceRotation] = useState({ x: 0, y: 0 });
  const [soundEnabled, setSoundEnabled] = useState(() => isMasterSoundEnabled());
  const [winner, setWinner] = useState(null);
  const [showRollHint, setShowRollHint] = useState(() => !savedGame?.hasRolled);
  const [playerNames, setPlayerNames] = useState(() => savedGame?.playerNames || DEFAULT_PLAYER_NAMES);

  // Persist in-progress game state to storage
  useEffect(() => {
    if (winner) {
      localStorage.removeItem(LUDO_STORAGE_KEY);
      return;
    }
    try {
      localStorage.setItem(
        LUDO_STORAGE_KEY,
        JSON.stringify({
          players,
          turn,
          activePlayers,
          isBot,
          diceRoll,
          message,
          hasRolled,
          playerNames,
          savedAt: Date.now(),
        })
      );
    } catch (error) {
      void error;
    }
  }, [players, turn, activePlayers, isBot, diceRoll, message, hasRolled, playerNames, winner]);

  const playableTokens = useMemo(() => getPlayableTokens(turn, players, diceRoll), [turn, players, diceRoll]);

  const formatPlayerName = useCallback((color, includeRole = false) => {
    const name = getPlayerDisplayName(color, playerNames);
    if (!includeRole) return name;
    if (isBot[color]) return `${name} (Bot)`;
    if (color === 'red') return `${name} (You)`;
    return `${name} (Player)`;
  }, [isBot, playerNames]);

  const getRotationForNumber = useCallback((num) => {
    switch (num) {
      case 1: return { x: 0, y: 0 };
      case 2: return { x: -90, y: 0 };
      case 3: return { x: 0, y: -90 };
      case 4: return { x: 0, y: 90 };
      case 5: return { x: 90, y: 0 };
      case 6: return { x: 180, y: 0 };
      default: return { x: 0, y: 0 };
    }
  }, []);

  const nextTurn = useCallback(() => {
    setHasRolled(false);
    setDiceRoll(1);
    const currIdx = activePlayers.indexOf(turn);
    const nextPlayer = activePlayers[(currIdx + 1) % activePlayers.length];
    setTurn(nextPlayer);
    setMessage(`${formatPlayerName(nextPlayer)}'s turn!`);
    playLudoSound('turn');
  }, [activePlayers, formatPlayerName, turn]);

  const checkCapture = useCallback((movedColor, newPlayersState, movedToken) => {
    const targetPos = getTokenPosition(movedColor, movedToken);
    const targetKey = `${targetPos[0]},${targetPos[1]}`;
    let captured = false;

    COLORS.forEach((color) => {
      if (color === movedColor) return;

      newPlayersState[color] = newPlayersState[color].map((token) => {
        if (token.status !== 'active') return token;

        const currentPos = getTokenPosition(color, token);
        const currentKey = `${currentPos[0]},${currentPos[1]}`;

        if (currentKey !== targetKey) return token;
        if (isPositionSafe(currentPos)) return token;

        captured = true;
        return { ...token, status: 'base', step: 0 };
      });
    });

    return captured;
  }, []);

  const throwDice3D = useCallback((finalNumber) => {
    setIsRolling(true);
    const baseSpinsX = Math.floor(Math.random() * 4 + 4) * 360;
    const baseSpinsY = Math.floor(Math.random() * 4 + 4) * 360;
    const target = getRotationForNumber(finalNumber);

    setDiceRotation({
      x: baseSpinsX + target.x,
      y: baseSpinsY + target.y,
    });

    window.setTimeout(() => {
      setDiceRoll(finalNumber);
      setHasRolled(true);
      setIsRolling(false);

      const available = getPlayableTokens(turn, players, finalNumber);
      if (available.length === 0) {
        setMessage(`No valid moves for ${formatPlayerName(turn)}.`);
        window.setTimeout(() => nextTurn(), 1200);
        return;
      }

      setMessage(`${formatPlayerName(turn)} rolled a ${finalNumber}. Choose a token.`);
    }, 1200);
  }, [formatPlayerName, getRotationForNumber, nextTurn, players, turn]);

  const handleRoll = useCallback(() => {
    if (hasRolled || isRolling || winner) return;
    setShowRollHint(false);
    setMessage(`${formatPlayerName(turn)} is rolling...`);
    const roll = Math.floor(Math.random() * 6) + 1;
    if (roll === 6) {
      playLudoSound('six');
    } else {
      playLudoSound('roll');
    }
    throwDice3D(roll);
  }, [formatPlayerName, hasRolled, isRolling, throwDice3D, turn, winner]);

  const handleTokenClick = useCallback((color, tokenId) => {
    if (winner || color !== turn || !hasRolled || isRolling) return;

    const token = players[color].find((piece) => piece.id === tokenId);
    if (!token) return;

    const available = getPlayableTokens(color, players, diceRoll);
    const isAllowed = available.some((piece) => piece.id === tokenId);
    if (!isAllowed) return;

    const nextPlayersState = {
      ...players,
      [color]: players[color].map((piece) => {
        if (piece.id !== tokenId) return piece;

        if (piece.status === 'base' && diceRoll === 6) {
          return { ...piece, status: 'active', step: 0 };
        }

        if (piece.status === 'active') {
          const nextStep = piece.step + diceRoll;
          return { ...piece, step: nextStep, status: nextStep === 57 ? 'home' : 'active' };
        }

        return piece;
      }),
    };

    setPlayers(nextPlayersState);

    const updatedToken = nextPlayersState[color].find((piece) => piece.id === tokenId);
    const wasCaptured = updatedToken && updatedToken.status === 'active'
      ? checkCapture(color, nextPlayersState, updatedToken)
      : false;

    const allHome = nextPlayersState[color].every((piece) => piece.status === 'home');
    if (allHome) {
      setWinner(color);
      setHasRolled(false);
      setDiceRoll(1);
      setMessage(`${formatPlayerName(color)} wins the game!`);
      playLudoSound('win');

      if (color === 'red' || !isBot[color]) {
        const saved = getGameScore('ludo');
        const prevWins = saved.stats?.wins || 0;
        saveGameScore('ludo', {
          highScore: prevWins + 1,
          stats: { wins: prevWins + 1 },
        });
      }
      return;
    }

    if (wasCaptured) {
      setHasRolled(false);
      setDiceRoll(1);
      setMessage(`Boom! ${formatPlayerName(color)} captured a piece and keeps rolling.`);
      playLudoSound('capture');
      return;
    }

    if (diceRoll === 6) {
      setHasRolled(false);
      setDiceRoll(1);
      setMessage(`${formatPlayerName(color)} rolled a 6. Roll again.`);
      playLudoSound('six');
      return;
    }

    playLudoSound('move');
    window.setTimeout(() => nextTurn(), 500);
  }, [checkCapture, diceRoll, formatPlayerName, hasRolled, isBot, isRolling, nextTurn, players, turn, winner]);

  useEffect(() => {
    if (!isBot[turn] || isRolling) return undefined;

    if (!hasRolled) {
      const timer = window.setTimeout(() => handleRoll(), 700);
      return () => window.clearTimeout(timer);
    }

    const available = getPlayableTokens(turn, players, diceRoll);
    if (available.length === 0) {
      const timer = window.setTimeout(() => nextTurn(), 800);
      return () => window.clearTimeout(timer);
    }

    const bestMove = chooseBestBotMove(turn, players, diceRoll);
    if (!bestMove) return undefined;

    const timer = window.setTimeout(() => {
      handleTokenClick(turn, bestMove.tokenId);
    }, 650);

    return () => window.clearTimeout(timer);
  }, [diceRoll, handleRoll, handleTokenClick, hasRolled, isBot, nextTurn, players, turn, isRolling]);

  useEffect(() => {
    setMasterSoundEnabled(soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        if (!isBot[turn] && !hasRolled && !isRolling && !winner) {
          e.preventDefault();
          handleRoll();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRoll, hasRolled, isBot, isRolling, turn, winner]);

  const setMode = (mode) => {
    localStorage.removeItem(LUDO_STORAGE_KEY);
    if (mode === '1p') {
      setIsBot({ red: false, green: true, yellow: true, blue: true });
      setActivePlayers(['red', 'green', 'yellow', 'blue']);
      setTurn('red');
    } else if (mode === '4p') {
      setIsBot({ red: false, green: false, yellow: false, blue: false });
      setActivePlayers(['red', 'green', 'yellow', 'blue']);
      setTurn('red');
    } else if (mode === '2p') {
      setIsBot({ red: false, yellow: false, green: true, blue: true });
      setActivePlayers(['red', 'yellow']);
      setTurn('red');
    }

    setWinner(null);
    setPlayers(buildInitialPlayers());
    setDiceRoll(1);
    setDiceRotation({ x: 0, y: 0 });
    setHasRolled(false);
    setIsRolling(false);
    setShowRollHint(true);
    setMessage('Red to roll!');
  };

  const renderGrid = () => {
    const cells = [];
    for (let row = 0; row < 15; row++) {
      for (let col = 0; col < 15; col++) {
        let cellClass = 'ludo-cell';

        if (row < 6 && col < 6) cellClass += ' yard-container yard-red-bg';
        else if (row < 6 && col > 8) cellClass += ' yard-container yard-green-bg';
        else if (row > 8 && col > 8) cellClass += ' yard-container yard-yellow-bg';
        else if (row > 8 && col < 6) cellClass += ' yard-container yard-blue-bg';
        else if (row >= 6 && row <= 8 && col >= 6 && col <= 8) cellClass += ' home-center';
        else cellClass += ' path';

        if (row === 7 && col > 0 && col < 6) cellClass += ' home-path-red gradient-glow';
        if (col === 7 && row > 0 && row < 6) cellClass += ' home-path-green gradient-glow';
        if (row === 7 && col > 8 && col < 14) cellClass += ' home-path-yellow gradient-glow';
        if (col === 7 && row > 8 && row < 14) cellClass += ' home-path-blue gradient-glow';

        if (row === 6 && col === 1) cellClass += ' safe safe-red gradient-glow';
        if (row === 1 && col === 8) cellClass += ' safe safe-green gradient-glow';
        if (row === 8 && col === 13) cellClass += ' safe safe-yellow gradient-glow';
        if (row === 13 && col === 6) cellClass += ' safe safe-blue gradient-glow';

        if ((row === 2 && col === 6) || (row === 6 && col === 12) || (row === 12 && col === 8) || (row === 8 && col === 2)) {
          cellClass += ' star-cell glowing-star';
        }

        cells.push(
          <div
            key={`${row}-${col}`}
            className={cellClass}
            style={{ gridRow: row + 1, gridColumn: col + 1 }}
          />
        );
      }
    }
    return cells;
  };

  const renderYardOverlay = (color) => {
    const isTop = color === 'red' || color === 'green';
    const top = isTop ? '0%' : 'calc(100% * 9 / 15)';
    const left = color === 'red' || color === 'blue' ? '0%' : 'calc(100% * 9 / 15)';

    return (
      <div key={`yard-${color}`} className={`yard-overlay block-${color}`} style={{ top, left }}>
        <div className="yard-inner-jewel">
          <div className="dimple-container">
            <div className="dimple" />
            <div className="dimple" />
            <div className="dimple" />
            <div className="dimple" />
          </div>
        </div>
      </div>
    );
  };

  const renderTokens = () => {
    return activePlayers.map((color) => (
      players[color].map((token) => {
        const [row, col] = getTokenPosition(color, token);
        const isPlayable = turn === color && hasRolled && !isRolling && !isBot[color] && playableTokens.some((piece) => piece.id === token.id);

        return (
          <div
            key={`${color}-${token.id}`}
            className={`ludo-token token-${color} ${isPlayable ? 'playable-pulse' : ''}`}
            style={{
              top: `calc(${(row + 0.5) / 15 * 100}%)`,
              left: `calc(${(col + 0.5) / 15 * 100}%)`,
            }}
            onClick={() => handleTokenClick(color, token.id)}
          >
            <div className="token-jewel">
              <div className="token-glint" />
            </div>
          </div>
        );
      })
    ));
  };

  const renderDiceValue = (num) => {
    switch (num) {
      case 1: return <div className="dot center" />;
      case 2: return <><div className="dot top-left" /><div className="dot bottom-right" /></>;
      case 3: return <><div className="dot top-left" /><div className="dot center" /><div className="dot bottom-right" /></>;
      case 4: return <><div className="dot top-left" /><div className="dot top-right" /><div className="dot bottom-left" /><div className="dot bottom-right" /></>;
      case 5: return <><div className="dot top-left" /><div className="dot top-right" /><div className="dot center" /><div className="dot bottom-left" /><div className="dot bottom-right" /></>;
      case 6: return <><div className="dot top-left" /><div className="dot top-right" /><div className="dot middle-left" /><div className="dot middle-right" /><div className="dot bottom-left" /><div className="dot bottom-right" /></>;
      default: return null;
    }
  };

  const getPlayerLabel = (color) => {
    if (isBot[color]) {
      return 'Bot';
    }

    if (color === 'red') {
      return 'You';
    }

    return 'Player';
  };

  const handlePlayerNameChange = (color, value) => {
    const trimmed = value.slice(0, 14);
    setPlayerNames((prev) => ({
      ...prev,
      [color]: trimmed,
    }));
  };

  return (
    <div className="game-wrapper animate-fade-in ludo">
      <header className="game-header ludo-header">
        <div className="ludo-header-top">
          <button className="btn-outline back-btn" onClick={onBack} aria-label="Return to games">
            ← Back
          </button>
          <h2 className="game-title">Masti Ludo</h2>
          <button
            type="button"
            className="btn-outline btn-sound-game mobile-sound-btn"
            onClick={() => setSoundEnabled((prev) => !prev)}
            aria-label={soundEnabled ? 'Mute sound' : 'Enable sound'}
            title={soundEnabled ? 'Mute sound' : 'Enable sound'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>

        <div className="ludo-mode-selector" role="radiogroup" aria-label="Game mode selection">
          <button
            type="button"
            className={`ludo-mode-btn ${activePlayers.length === 4 && isBot.green ? 'active' : ''}`}
            onClick={() => setMode('1p')}
            role="radio"
            aria-checked={activePlayers.length === 4 && isBot.green}
          >
            <span className="mode-emoji">🤖</span>
            <span className="mode-text-full">1P vs Bots</span>
            <span className="mode-text-compact">1P Bots</span>
            <span className="mode-text-tiny">1P</span>
          </button>
          <button
            type="button"
            className={`ludo-mode-btn ${activePlayers.length === 2 ? 'active' : ''}`}
            onClick={() => setMode('2p')}
            role="radio"
            aria-checked={activePlayers.length === 2}
          >
            <span className="mode-emoji">👥</span>
            <span className="mode-text-full">2 Player</span>
            <span className="mode-text-compact">2 Player</span>
            <span className="mode-text-tiny">2P</span>
          </button>
          <button
            type="button"
            className={`ludo-mode-btn ${activePlayers.length === 4 && !isBot.green ? 'active' : ''}`}
            onClick={() => setMode('4p')}
            role="radio"
            aria-checked={activePlayers.length === 4 && !isBot.green}
          >
            <span className="mode-emoji">🎮</span>
            <span className="mode-text-full">4 Player</span>
            <span className="mode-text-compact">4 Player</span>
            <span className="mode-text-tiny">4P</span>
          </button>
        </div>

        <button
          type="button"
          className="btn-outline btn-sound-game desktop-sound-btn"
          onClick={() => setSoundEnabled((prev) => !prev)}
          aria-label={soundEnabled ? 'Mute sound' : 'Enable sound'}
          title={soundEnabled ? 'Mute sound' : 'Enable sound'}
        >
          {soundEnabled ? '🔊 Sound On' : '🔇 Sound Off'}
        </button>
      </header>

      <div className="ludo-content">
        <div className="ludo-sidebar glass-panel">
          <div className="active-player-panel">
            <div className={`active-player-glow glow-${turn}`} />
            <div className="turn-badge">Current Turn</div>
            <h3 className="turn-indicator" style={{ color: `var(--color-${turn})` }}>
              {getPlayerDisplayName(turn, playerNames)}
              <span className="turn-role">{isBot[turn] ? ' Bot' : ' You'}</span>
            </h3>
            <div className="ludo-message" aria-live="polite" aria-atomic="true">{message}</div>
          </div>

          <div className="player-list" aria-label="Players">
            {activePlayers.map((color) => (
              <div
                key={color}
                className={`player-row ${turn === color ? 'active' : ''} ${isBot[color] ? 'bot' : 'human'}`}
                style={{
                  borderLeft: `3px solid ${PLAYER_COLOR_MAP[color]}`,
                  boxShadow: turn === color ? `inset 0 0 0 1px ${PLAYER_COLOR_MAP[color]}44, 0 0 18px rgba(15, 23, 42, 0.2)` : 'none',
                }}
              >
                <span
                  className="player-swatch"
                  style={{
                    background: PLAYER_COLOR_MAP[color],
                    boxShadow: `0 0 0 2px ${PLAYER_COLOR_MAP[color]}55, 0 0 12px ${PLAYER_COLOR_MAP[color]}88`,
                  }}
                />
                <input
                  className="player-name-input"
                  type="text"
                  value={playerNames[color] || ''}
                  onChange={(event) => handlePlayerNameChange(color, event.target.value)}
                  aria-label={`${getPlayerDisplayName(color, playerNames)} name`}
                />
                <span className="player-type">{getPlayerLabel(color)}</span>
              </div>
            ))}
          </div>

          <div className="dice-container">
            <button
              type="button"
              className="dice-scene"
              onClick={handleRoll}
              disabled={isBot[turn] || hasRolled || isRolling}
              aria-label={isBot[turn] ? "Waiting for the bot to roll" : hasRolled ? `Rolled ${diceRoll}` : "Roll the dice"}
            >
              <div
                className={`cube ${isRolling ? 'cube-rolling-blur' : ''}`}
                style={{ transform: `translateZ(-50px) rotateX(${diceRotation.x}deg) rotateY(${diceRotation.y}deg)` }}
              >
                <div className="cube__face cube__face--front">{renderDiceValue(1)}</div>
                <div className="cube__face cube__face--up">{renderDiceValue(2)}</div>
                <div className="cube__face cube__face--right">{renderDiceValue(3)}</div>
                <div className="cube__face cube__face--left">{renderDiceValue(4)}</div>
                <div className="cube__face cube__face--down">{renderDiceValue(5)}</div>
                <div className="cube__face cube__face--back">{renderDiceValue(6)}</div>
              </div>
            </button>

            {!isBot[turn] && !hasRolled && showRollHint && (
              <div className="roll-hint">Click Dice to Roll</div>
            )}
          </div>
        </div>

        <div className="ludo-board-wrapper">
          <div className="ludo-board-3d-box">
            <div className="ludo-board">
              {renderGrid()}
              {COLORS.map((color) => renderYardOverlay(color))}
              <div className="home-center-graphic" />
              {renderTokens()}
            </div>
          </div>
        </div>
      </div>

      {winner && (
        <div className="ludo-modal-overlay animate-fade-in" role="dialog" aria-modal="true">
          <div className="ludo-modal">
            <div className="victory-crown">👑</div>
            <h2>Victory!</h2>
            <p className="winner-declaration">
              <strong style={{ color: PLAYER_COLOR_MAP[winner] }}>
                {formatPlayerName(winner, true)}
              </strong>{' '}
              wins the match!
            </p>
            <div className="ludo-modal-buttons">
              <button
                type="button"
                className="btn-primary"
                onClick={() => setMode('1p')}
              >
                Play Again
              </button>
              <button
                type="button"
                className="btn-outline"
                onClick={onBack}
              >
                Arcade Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ludo;
