import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { API } from '../../api-helper';
import { GameView } from '../ui/Game';
import { SpinView } from '../ui/SpinView';
import { BankView } from '../ui/Bank';

// ============================================================================
// GAME PAGE
// ============================================================================

export const GamePage = ({ user, onLogout, onUpdateUser }) => {
  const [view, setView] = useState('game');
  const [guesses, setGuesses] = useState(['', '', '']);
  const [bet, setBet] = useState(10);
  const [result, setResult] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [gameSettings, setGameSettings] = useState(null);

  useEffect(() => {
    loadGameSettings();
  }, []);

  const loadGameSettings = async () => {
    try {
      const response = await API.getGameSettings();
      if (response.success) {
        setGameSettings(response.settings);
        setBet(response.settings.minBet);
      }
    } catch (error) {
      console.error('Failed to load game settings:', error);
    }
  };

  const handleGuessChange = (index, value) => {
    if (value === '' || (value >= 0 && value <= 9 && value.length === 1)) {
      const newGuesses = [...guesses];
      newGuesses[index] = value;
      setGuesses(newGuesses);
    }
  };

  const handlePlay = async () => {
    if (guesses.some(g => g === '')) {
      alert('Please enter all 3 numbers');
      return;
    }

    if (user.balance < bet) {
      alert('Insufficient balance. Please deposit funds.');
      return;
    }

    setPlaying(true);
    setResult(null);

    try {
      const gameResult = await API.playGame(bet, guesses);

      if (gameResult.success) {
        setResult(gameResult);
        onUpdateUser({ ...user, balance: gameResult.newBalance });

        if (gameResult.matches >= 2) {
          setShowCelebration(true);
          setTimeout(() => setShowCelebration(false), 3000);
        }
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Game error occurred');
    } finally {
      setPlaying(false);
    }
  };

  const handlePlayAgain = () => {
    setResult(null);
    setGuesses(['', '', '']);
  };

  if (!user) {
    return <div className="loading-screen">Loading user data...</div>;
  }

  return (
    <div className="game-container">
      <nav className="top-nav">
        <div className="nav-left">
          <h2>🎰 Lucky Triple</h2>
        </div>
        <div className="nav-center">
          <button
            className={(view === 'game' || view === 'spin') ? 'active' : ''}
            onClick={() => setView(view === 'spin' ? 'spin' : 'game')}
          >
            🎮 Games
          </button>
          <button
            className={view === 'bank' ? 'active' : ''}
            onClick={() => setView('bank')}
          >
            🏦 Bank
          </button>
        </div>
        <div className="nav-right">
          <div className="balance-display">
            <span className="balance-label">Balance</span>
            <span className="balance-amount">GHS {user?.balance?.toFixed(2) || '0.00'}</span>
          </div>
          <button onClick={onLogout} className="logout-btn">Logout</button>
        </div>
      </nav>

      {/* Sub-nav for games */}
      {(view === 'game' || view === 'spin') && (
        <div className="game-tabs" style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '15px' }}>
          <button
            onClick={() => setView('game')}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: 'none',
              background: view === 'game' ? '#FFC107' : '#333',
              color: view === 'game' ? '#000' : '#fff',
              cursor: 'pointer'
            }}
          >
            🔢 Lucky Triple
          </button>
          <button
            onClick={() => setView('spin')}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: 'none',
              background: view === 'spin' ? '#FFC107' : '#333',
              color: view === 'spin' ? '#000' : '#fff',
              cursor: 'pointer'
            }}
          >
            🍾 Spin the Bottle
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {view === 'game' ? (
          <GameView
            key="game"
            guesses={guesses}
            bet={bet}
            result={result}
            playing={playing}
            showCelebration={showCelebration}
            gameSettings={gameSettings}
            onGuessChange={handleGuessChange}
            onBetChange={setBet}
            onPlay={handlePlay}
            onPlayAgain={handlePlayAgain}
            userBalance={user.balance || 0}
          />
        ) : view === 'spin' ? (
          <SpinView
            key="spin"
            userBalance={user.balance || 0}
            gameSettings={gameSettings}
            onUpdateUser={onUpdateUser}
          />
        ) : (
          <BankView
            key="bank"
            user={user}
            onUpdateUser={onUpdateUser}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
