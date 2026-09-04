import React, { useState } from 'react';
import './Auth.css';

// Keep the API on the same origin in production. This lets Cloudflare Pages
// serve the game and its authentication API from one public URL.
const API_BASE = import.meta.env.VITE_API_BASE || '/api/auth';

const Auth = ({ onLogin }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isLoginView ? '/login' : '/register';
    
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      let data = null;
      try {
        const text = await response.text();
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(data?.error || `Server connection failed (Status ${response.status}). Please verify the backend is running.`);
      }

      if (!data || !data.token) {
        throw new Error('Invalid response received from server. Please try again.');
      }

      // Success
      localStorage.setItem('omni_token', data.token);
      onLogin(data.user.username);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Dev-only helper for local testing (not shown on UI)
  React.useEffect(() => {
    if (typeof window !== 'undefined' && (import.meta.env.DEV || window.location.search.includes('dev=1'))) {
      window.__devDemoLogin = async () => {
        try {
          const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'demo', password: 'password123' }),
          });
          const text = await response.text();
          const data = text ? JSON.parse(text) : null;
          if (data?.token) {
            localStorage.setItem('omni_token', data.token);
            onLogin(data.user.username);
          }
        } catch (e) {
          console.error('Dev demo login failed:', e);
        }
      };
      return () => {
        delete window.__devDemoLogin;
      };
    }
  }, [onLogin]);

  const toggleView = () => {
    setIsLoginView(!isLoginView);
    setError('');
    setUsername('');
    setPassword('');
  };

  return (
    <div className="auth-container animate-fade-in">
      <div className="auth-glass-panel">
        <h1 className="auth-title">MastiAdda</h1>
        <h2 className="auth-subtitle">{isLoginView ? 'Welcome to MastiAdda' : 'Create Account'}</h2>
        
        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="username">Username</label>
            <input 
              type="text" 
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required 
              placeholder="Enter your username"
            />
          </div>
          <div className="input-group">
            <div className="input-label-row">
              <label htmlFor="password">Password</label>
              <button 
                type="button" 
                className="btn-toggle-pw"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <input 
              type={showPassword ? 'text' : 'password'} 
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
              placeholder="Enter your password"
            />
          </div>
          <button type="submit" className="btn-primary auth-submit" disabled={loading}>
            {loading ? 'Processing...' : (isLoginView ? 'Sign In' : 'Register')}
          </button>
        </form>

        <div className="auth-toggle">
          {isLoginView ? "Don't have an account? " : "Already have an account? "}
          <button className="btn-link" onClick={toggleView}>
            {isLoginView ? 'Sign Up' : 'Log In'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
