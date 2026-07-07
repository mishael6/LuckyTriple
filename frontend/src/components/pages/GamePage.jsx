import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { API } from '../../api-helper';
import { GameView } from '../ui/Game';
import { SpinView } from '../ui/SpinView';
import { SlotsView } from '../ui/SlotsView';
import { RouletteView } from '../ui/RouletteView';
import { BankView } from '../ui/Bank';
import { CasinoLobby } from '../ui/CasinoLobby';
import { CasinoBackground } from '../ui/CasinoBackground';

const GAME_NAMES = {
  'lucky-triple': '🎰 Lucky Triple',
  spin: '🍾 Spin the Bottle',
  slots: '🎰 Lucky Slots',
  roulette: '🎡 Golden Roulette',
};

export const GamePage = ({ user, onLogout, onUpdateUser }) => {
  const [view, setView] = useState('lobby');
  const [guesses, setGuesses] = useState(['', '', '']);
  const [bet, setBet] = useState(10);
  const [result, setResult] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [gameSettings, setGameSettings] = useState(null);

  const [balanceFlash, setBalanceFlash] = useState(null);

  useEffect(() => {
    loadGameSettings();
  }, []);

  const applyBalanceUpdate = useCallback(async (newBalance, profit) => {
    const parsed = Number(newBalance);
    if (Number.isFinite(parsed)) {
      onUpdateUser({ balance: parsed });
      setBalanceFlash(profit > 0 ? 'win' : profit < 0 ? 'lose' : null);
      setTimeout(() => setBalanceFlash(null), 1200);
    }

    try {
      const response = await API.getMe();
      if (response.success && response.user) {
        onUpdateUser(response.user);
      }
    } catch (error) {
      console.error('Failed to sync balance:', error);
    }
  }, [onUpdateUser]);

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
    if (guesses.some((g) => g === '')) {
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
        await applyBalanceUpdate(gameResult.newBalance, gameResult.profit);
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

  const handleSelectGame = (gameId) => {
    setView(gameId);
    if (gameId === 'lucky-triple') {
      setResult(null);
      setGuesses(['', '', '']);
    }
  };

  const handleGameUpdateUser = (updates) => {
    if (updates.balance !== undefined) {
      applyBalanceUpdate(updates.balance, updates.profit ?? 0);
    } else {
      onUpdateUser(updates);
    }
  };

  const isInGame = ['lucky-triple', 'spin', 'slots', 'roulette'].includes(view);

  if (!user) {
    return <div className="loading-screen">Loading user data...</div>;
  }

  return (
    <div className="game-container">
      <CasinoBackground />

      <nav className="top-nav">
        <div className="nav-left">
          <button type="button" className="brand-btn" onClick={() => setView('lobby')}>
            <span className="brand-btn__mark">🎰</span>
            <span className="brand-btn__text">Lucky Triple Casino</span>
          </button>
        </div>

        <div className="nav-center">
          <button type="button" className={view === 'lobby' ? 'active' : ''} onClick={() => setView('lobby')}>
            🏠 Lobby
          </button>
          <button type="button" className={view === 'bank' ? 'active' : ''} onClick={() => setView('bank')}>
            💳 Wallet
          </button>
        </div>

        <div className="nav-right">
          <div className={`balance-display ${balanceFlash ? `balance-display--${balanceFlash}` : ''}`}>
            <span className="balance-label">Balance</span>
            <span className="balance-amount">GHS {user?.balance?.toFixed(2) || '0.00'}</span>
          </div>
          <button type="button" onClick={onLogout} className="logout-btn">Logout</button>
        </div>
      </nav>

      {isInGame && (
        <motion.div className="game-breadcrumb" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <button type="button" onClick={() => setView('lobby')} className="game-breadcrumb__back">
            ← Back to lobby
          </button>
          <span className="game-breadcrumb__current">{GAME_NAMES[view]}</span>
        </motion.div>
      )}

      <main className="game-main">
        <AnimatePresence mode="wait">
          {view === 'lobby' && (
            <CasinoLobby key="lobby" onSelectGame={handleSelectGame} gameSettings={gameSettings} />
          )}

          {view === 'lucky-triple' && (
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
          )}

          {view === 'spin' && (
            <SpinView
              key="spin"
              userBalance={user.balance || 0}
              gameSettings={gameSettings}
              onUpdateUser={handleGameUpdateUser}
            />
          )}

          {view === 'slots' && (
            <SlotsView
              key="slots"
              userBalance={user.balance || 0}
              gameSettings={gameSettings}
              onUpdateUser={handleGameUpdateUser}
            />
          )}

          {view === 'roulette' && (
            <RouletteView
              key="roulette"
              userBalance={user.balance || 0}
              gameSettings={gameSettings}
              onUpdateUser={handleGameUpdateUser}
            />
          )}

          {view === 'bank' && (
            <BankView key="bank" user={user} onUpdateUser={onUpdateUser} />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};
