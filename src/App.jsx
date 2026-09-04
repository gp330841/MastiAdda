import { useState, useEffect } from 'react'
import './App.css'
import Home from './components/Home'
import TicTacToe from './components/TicTacToe'
import Ludo from './components/Ludo'
import RockPaperScissors from './components/RockPaperScissors'
import TwentyFortyEight from './components/TwentyFortyEight'
import Chess from './components/Chess'
import Auth from './components/Auth'
import { initScoreSync } from './utils/scoreSync.js'
import { isMasterSoundEnabled, setMasterSoundEnabled, playClickSound } from './utils/gameAudio.js'

const GAME_NAMES = {
  tictactoe: 'Tic Tac Toe',
  ludo: 'Omni Ludo',
  rockpaperscissors: 'Rock Paper Scissors',
  '2048': '2048',
  chess: 'Chess',
};

function App() {
  const [activeGame, setActiveGame] = useState('home');
  const [soundOn, setSoundOn] = useState(() => isMasterSoundEnabled());
  const [currentUser, setCurrentUser] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('omni_user') : null;
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window === 'undefined') return false;
    const token = localStorage.getItem('omni_token');
    const user = localStorage.getItem('omni_user');
    return Boolean(token && !user);
  });

  // Initialize multi-session score sync
  useEffect(() => {
    if (currentUser) {
      initScoreSync();
    }
  }, [currentUser]);

  // Check valid session on mount
  useEffect(() => {
    const token = localStorage.getItem('omni_token');
    if (!token) return;

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      setLoading(false);
    }, 1500);

    fetch(`${import.meta.env.VITE_API_BASE || '/api/auth'}/me`, {
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(res => {
      if (res.ok) return res.json();
      throw new Error('Invalid token');
    })
    .then(data => {
      setCurrentUser(data.user.username);
      localStorage.setItem('omni_user', data.user.username);
    })
    .catch(() => {
      localStorage.removeItem('omni_token');
    })
    .finally(() => {
      clearTimeout(timeout);
      setLoading(false);
    });
  }, []);

  const handleLogin = (username) => {
    setCurrentUser(username);
    localStorage.setItem('omni_user', username);
    initScoreSync();
  };

  const handleLogout = () => {
    playClickSound();
    localStorage.removeItem('omni_token');
    localStorage.removeItem('omni_user');
    setCurrentUser(null);
    setActiveGame('home');
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setMasterSoundEnabled(next);
    if (next) playClickSound();
  };

  const renderGame = () => {
    if (loading) {
      return <div className="loader">Loading OmniGames...</div>;
    }

    if (!currentUser) {
      return <Auth onLogin={handleLogin} />;
    }

    switch (activeGame) {
      case 'tictactoe':
        return <TicTacToe onBack={() => setActiveGame('home')} />;
      case 'ludo':
        return <Ludo onBack={() => setActiveGame('home')} />;
      case 'rockpaperscissors':
        return <RockPaperScissors onBack={() => setActiveGame('home')} />;
      case '2048':
        return <TwentyFortyEight onBack={() => setActiveGame('home')} />;
      case 'chess':
        return <Chess onBack={() => setActiveGame('home')} />;
      default:
        return <Home onSelectGame={setActiveGame} />;
    }
  };

  return (
    <div className="app-container">
      {/* Background decoration */}
      <div className="bg-decor top-left"></div>
      <div className="bg-decor bottom-right"></div>

      {/* Top Application Bar */}
      {currentUser && (
        <header className="app-header-nav" role="banner">
          <div className="nav-brand-container">
            <button
              type="button"
              className="nav-brand-btn"
              onClick={() => { playClickSound(); setActiveGame('home'); }}
              aria-label="Return to arcade games home"
            >
              <span className="brand-logo">🎮</span>
              <span className="brand-text">OmniGames</span>
            </button>
            {activeGame !== 'home' && (
              <span className="nav-breadcrumb">
                / <b>{GAME_NAMES[activeGame]}</b>
              </span>
            )}
          </div>

          <div className="nav-controls">
            <button
              type="button"
              className="btn-sound-toggle"
              onClick={toggleSound}
              aria-label={soundOn ? 'Mute game sound' : 'Unmute game sound'}
              title={soundOn ? 'Mute audio' : 'Enable audio'}
            >
              {soundOn ? '🔊' : '🔇'}
            </button>

            <div className="user-profile-badge" title="Logged in session">
              <span className="user-avatar-circle">{currentUser.charAt(0).toUpperCase()}</span>
              <span className="user-name-text">{currentUser}</span>
              <span className="sync-dot" title="Cloud score sync active" aria-label="Cloud sync active"></span>
            </div>

            <button
              type="button"
              className="btn-outline btn-sm nav-logout-btn"
              onClick={handleLogout}
              aria-label="Log out of OmniGames"
            >
              Logout
            </button>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main className="main-content">
        {renderGame()}
      </main>
    </div>
  );
}

export default App

