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
  ludo: 'Masti Ludo',
  rockpaperscissors: 'Rock Paper Scissors',
  '2048': '2048',
  chess: 'Chess',
};

function App() {
  const [activeGame, setActiveGame] = useState(() => {
    if (typeof window === 'undefined') return 'home';
    const params = new URLSearchParams(window.location.search);
    return params.get('game') || 'home';
  });
  const [soundOn, setSoundOn] = useState(() => isMasterSoundEnabled());
  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    if (params.get('demo') === '1') return 'demo';
    return localStorage.getItem('omni_user');
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
      initScoreSync(currentUser);
    }
  }, [currentUser]);

  // Check valid session on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isDemoParam = params.get('demo') === '1';

    if (isDemoParam) {
      // Auto-authenticate demo user for headless testing & preview
      fetch(`${import.meta.env.VITE_API_BASE || '/api/auth'}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'demo', password: 'password123' })
      })
      .then(async (res) => {
        const text = await res.text();
        const data = text ? JSON.parse(text) : null;
        if (data?.token) {
          localStorage.setItem('omni_token', data.token);
          localStorage.setItem('omni_user', 'demo');
          setCurrentUser('demo');
        }
      })
      .catch(() => {});
      return;
    }

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
    .then(async (res) => {
      if (!res.ok) throw new Error('Invalid token');
      const text = await res.text();
      return text ? JSON.parse(text) : null;
    })
    .then((data) => {
      if (data?.user?.username) {
        setCurrentUser(data.user.username);
        localStorage.setItem('omni_user', data.user.username);
      }
    })
    .catch(() => {
      localStorage.removeItem('omni_token');
    })
    .finally(() => {
      clearTimeout(timeout);
      setLoading(false);
    });
  }, []);

  // Handle scroll position on game navigation
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const scrollVal = parseInt(params.get('scroll') || '0', 10);
    if (scrollVal > 0) {
      setTimeout(() => {
        window.scrollTo({ top: scrollVal, behavior: 'instant' });
      }, 150);
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [activeGame]);

  const handleLogin = (username) => {
    setCurrentUser(username);
    localStorage.setItem('omni_user', username);
    initScoreSync(username);
  };

  const handleLogout = () => {
    playClickSound();
    localStorage.removeItem('omni_token');
    localStorage.removeItem('omni_user');
    localStorage.removeItem('omni_chess_state');
    localStorage.removeItem('omni_2048_active_game');
    localStorage.removeItem('omni_ludo_active_game');
    localStorage.removeItem('omni_tictactoe_active_game');
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
      return <div className="loader">Loading MastiAdda...</div>;
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
              aria-label="Return to MastiAdda home"
            >
              <span className="brand-logo">🎮</span>
              <span className="brand-text">MastiAdda</span>
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
              aria-label="Log out of MastiAdda"
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

