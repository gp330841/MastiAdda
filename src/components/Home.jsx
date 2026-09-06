import React, { useEffect, useState } from 'react';
import './Home.css';
import { subscribeToScores } from '../utils/scoreSync.js';
import { playClickSound } from '../utils/gameAudio.js';

const Home = ({ onSelectGame }) => {
  const [scores, setScores] = useState({});

  useEffect(() => {
    const unsubscribe = subscribeToScores((updatedScores) => {
      setScores(updatedScores || {});
    });
    return unsubscribe;
  }, []);

  const handleCardClick = (game) => {
    playClickSound();
    onSelectGame(game);
  };

  const get2048Stats = () => {
    const best = scores['2048']?.highScore || 0;
    return best > 0 ? `Best: ${best}` : null;
  };

  const getTicTacToeStats = () => {
    const stats = scores['tictactoe']?.stats;
    if (!stats || (!stats.wins && !stats.losses)) return null;
    return `${stats.wins || 0}W - ${stats.losses || 0}L`;
  };

  const getRPSStats = () => {
    const stats = scores['rockpaperscissors']?.stats;
    if (!stats || (!stats.player1 && !stats.player2)) return null;
    return `${stats.player1 || 0}W - ${stats.player2 || 0}L`;
  };

  const getChessStats = () => {
    const stats = scores['chess']?.stats;
    if (!stats || !stats.wins) return null;
    return `${stats.wins} Won`;
  };

  const getLudoStats = () => {
    const stats = scores['ludo']?.stats;
    if (!stats || !stats.wins) return null;
    return `${stats.wins} Won`;
  };

  return (
    <div className="home-container animate-fade-in">
      <header className="home-header">
        <h1>MastiAdda</h1>
        <p className="subtitle">अपना देसी गेमिंग अड्डा • Select a game to play</p>
      </header>
      
      <div className="game-grid">
        <button
          type="button"
          className="game-card game-card-wrapper" 
          onClick={() => handleCardClick('tictactoe')}
          aria-label="Play Tic Tac Toe"
        >
          <div className="card-glass">
            {getTicTacToeStats() && (
              <span className="card-stat-pill" title="Your synced cloud record">
                🏆 {getTicTacToeStats()}
              </span>
            )}
            <div className="game-icon tictactoe-icon">
              <span>X</span>
              <span>O</span>
            </div>
            <h2>Tic Tac Toe</h2>
            <p>The classic 3x3 strategy game. Play with a friend or challenge the unbeatable Bot.</p>
            <span className="btn-play">Play Now</span>
          </div>
        </button>

        <button
          type="button"
          className="game-card game-card-wrapper" 
          onClick={() => handleCardClick('ludo')}
          aria-label="Play Ludo"
        >
          <div className="card-glass">
            {getLudoStats() && (
              <span className="card-stat-pill" title="Your synced cloud record">
                🏆 {getLudoStats()}
              </span>
            )}
            <div className="game-icon ludo-icon">
              <div className="ludo-dots">
                <div className="dot red"></div>
                <div className="dot green"></div>
                <div className="dot blue"></div>
                <div className="dot yellow"></div>
              </div>
            </div>
            <h2>Ludo</h2>
            <p>Race your tokens to the center in this epic board game. Play up to 4 players or Bots.</p>
            <span className="btn-play">Play Now</span>
          </div>
        </button>

        <button
          type="button"
          className="game-card game-card-wrapper" 
          onClick={() => handleCardClick('2048')}
          aria-label="Play 2048"
        >
          <div className="card-glass">
            {get2048Stats() && (
              <span className="card-stat-pill" title="Your synced cloud high score">
                🏆 {get2048Stats()}
              </span>
            )}
            <div className="game-icon game2048-icon">
              <span>2</span>
              <span>0</span>
              <span>4</span>
              <span>8</span>
            </div>
            <h2>2048</h2>
            <p>Slide and merge tiles to reach 2048. A fun puzzle game of numbers and strategy.</p>
            <span className="btn-play">Play Now</span>
          </div>
        </button>

        <button
          type="button"
          className="game-card game-card-wrapper" 
          onClick={() => handleCardClick('chess')}
          aria-label="Play Chess"
        >
          <div className="card-glass">
            {getChessStats() && (
              <span className="card-stat-pill" title="Your synced cloud record">
                🏆 {getChessStats()}
              </span>
            )}
            <div className="game-icon chess-icon">
              <span>♔</span>
              <span>♛</span>
            </div>
            <h2>Chess</h2>
            <p>The ultimate strategy game. Play against the AI or challenge a friend to a match.</p>
            <span className="btn-play">Play Now</span>
          </div>
        </button>
      </div>

      {/* Hidden Option for Rock Paper Scissors */}
      <div className="hidden-game-container">
        <button
          type="button"
          className="btn-hidden-game"
          onClick={() => handleCardClick('rockpaperscissors')}
          aria-label="Play hidden Rock Paper Scissors game"
          title="Secret Arcade: Rock Paper Scissors"
        >
          <span className="secret-lock-icon">🔒</span>
          <span className="secret-title">Secret Game: <b>Rock Paper Scissors</b></span>
          <span className="secret-emojis">✊ ✋ ✌️</span>
          {getRPSStats() && (
            <span className="secret-stat-pill" title="Your cloud score">
              🏆 {getRPSStats()}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default Home;
