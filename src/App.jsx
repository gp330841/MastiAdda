import { useState, useEffect } from 'react'
import './App.css'
import Home from './components/Home'
import TicTacToe from './components/TicTacToe'
import Ludo from './components/Ludo'
import RockPaperScissors from './components/RockPaperScissors'
import TwentyFortyEight from './components/TwentyFortyEight'
import Chess from './components/Chess'
import Auth from './components/Auth'

function App() {
  const [activeGame, setActiveGame] = useState('home');
  const [currentUser, setCurrentUser] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('omni_user') : null;
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window === 'undefined') return false;
    const token = localStorage.getItem('omni_token');
    const user = localStorage.getItem('omni_user');
    // If already have saved user, don't block render with loader
    return Boolean(token && !user);
  });

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
      // If token expired or server unreachable, clear token
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
  };

  const handleLogout = () => {
    localStorage.removeItem('omni_token');
    localStorage.removeItem('omni_user');
    setCurrentUser(null);
    setActiveGame('home');
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
        return (
          <>
            <div className="user-nav">
              <span className="welcome-text">Logged in as <b>{currentUser}</b></span>
              <button className="btn-outline btn-sm" onClick={handleLogout}>Logout</button>
            </div>
            <Home onSelectGame={setActiveGame} />
          </>
        );
    }
  }

  return (
    <div className="app-container">
      {/* Background decoration */}
      <div className="bg-decor top-left"></div>
      <div className="bg-decor bottom-right"></div>
      
      {/* Main Content Area */}
      <main className="main-content">
        {renderGame()}
      </main>
    </div>
  )
}

export default App
