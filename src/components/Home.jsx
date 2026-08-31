import React from 'react';
import './Home.css';

const Home = ({ onSelectGame }) => {
  return (
    <div className="home-container animate-fade-in">
      <header className="home-header">
        <h1>OmniGames Arcade</h1>
        <p className="subtitle">Select a classic to start playing.</p>
      </header>
      
      <div className="game-grid">
        <div 
          className="game-card game-card-wrapper" 
          onClick={() => onSelectGame('tictactoe')}
        >
          <div className="card-glass">
            <div className="game-icon tictactoe-icon">
              <span>X</span>
              <span>O</span>
            </div>
            <h2>Tic Tac Toe</h2>
            <p>The classic 3x3 strategy game. Play with a friend or challenge the unbeatable Bot.</p>
            <button className="btn-play">Play Now</button>
          </div>
        </div>

        <div 
          className="game-card game-card-wrapper" 
          onClick={() => onSelectGame('ludo')}
        >
          <div className="card-glass">
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
            <button className="btn-play">Play Now</button>
          </div>
        </div>

        <div 
          className="game-card game-card-wrapper" 
          onClick={() => onSelectGame('rockpaperscissors')}
        >
          <div className="card-glass">
            <div className="game-icon rps-icon">
              <span>✊</span>
              <span>✋</span>
              <span>✌️</span>
            </div>
            <h2>Rock Paper Scissors</h2>
            <p>Challenge the computer or play with a friend. The classic hand game never gets old.</p>
            <button className="btn-play">Play Now</button>
          </div>
        </div>

        <div 
          className="game-card game-card-wrapper" 
          onClick={() => onSelectGame('2048')}
        >
          <div className="card-glass">
            <div className="game-icon game2048-icon">
              <span>2</span>
              <span>0</span>
              <span>4</span>
              <span>8</span>
            </div>
            <h2>2048</h2>
            <p>Slide and merge tiles to reach 2048. A fun puzzle game of numbers and strategy.</p>
            <button className="btn-play">Play Now</button>
          </div>
        </div>

        <div 
          className="game-card game-card-wrapper" 
          onClick={() => onSelectGame('chess')}
        >
          <div className="card-glass">
            <div className="game-icon chess-icon">
              <span>♔</span>
              <span>♛</span>
            </div>
            <h2>Chess</h2>
            <p>The ultimate strategy game. Play against the AI or challenge a friend to a match.</p>
            <button className="btn-play">Play Now</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
