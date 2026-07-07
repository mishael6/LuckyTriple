import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { API } from '../../api-helper';
import { GameView } from '../ui/Game';
import { PredictionGameView } from '../ui/PredictionGameView';
import { SlotsView } from '../ui/SlotsView';
import { BankView } from '../ui/Bank';
import { CasinoLobby } from '../ui/CasinoLobby';
import { CasinoBackground } from '../ui/CasinoBackground';
import { GAME_IMAGES } from '../../assets/gameAssets';
import { AdBanner } from '../../ads/AdBanner';
import { AdInterstitial } from '../../ads/AdInterstitial';
import { INTERSTITIAL_FREQUENCY, hasInterstitialSlot, isAdsConfigured } from '../../ads/adConfig';

const GAME_NAMES = {
  'lucky-triple': '🎰 Lucky Triple',
  spin: '🍾 Spin the Bottle',
  slots: '🎰 Lucky Slots',
  roulette: '🎡 Golden Roulette',
  coin: '🪙 Coin Flip',
  dice: '🎲 Dice Duel',
};

const PREDICTION_GAMES = {
  spin: {
    title: 'Spin the Bottle',
    subtitle: 'Predict up or down — pick your multiplier!',
    emoji: '🍾',
    imageSrc: GAME_IMAGES.spin,
    visual: 'bottle',
    choiceA: { value: 'up', label: 'UP', icon: '⬆️' },
    choiceB: { value: 'bottom', label: 'BOTTOM', icon: '⬇️' },
    playLabel: 'SPIN NOW',
    play: (bet, choice, mult) => API.playSpinGame(bet, choice, mult),
  },
  roulette: {
    title: 'Golden Roulette',
    subtitle: 'Red or black? Choose your multiplier like Spin the Bottle!',
    emoji: '🎡',
    imageSrc: GAME_IMAGES.roulette,
    visual: 'wheel',
    choiceA: { value: 'red', label: 'RED', icon: '🔴' },
    choiceB: { value: 'black', label: 'BLACK', icon: '⚫' },
    playLabel: 'SPIN WHEEL',
    play: (bet, choice, mult) => API.playRouletteGame(bet, choice, mult),
  },
  coin: {
    title: 'Coin Flip',
    subtitle: 'Heads or tails — flip for glory!',
    emoji: '🪙',
    imageSrc: GAME_IMAGES.coin,
    visual: 'coin',
    choiceA: { value: 'heads', label: 'HEADS', icon: '🪙' },
    choiceB: { value: 'tails', label: 'TAILS', icon: '✨' },
    playLabel: 'FLIP COIN',
    play: (bet, choice, mult) => API.playCoinGame(bet, choice, mult),
  },
  dice: {
    title: 'Dice Duel',
    subtitle: 'High (4-6) or Low (1-3)? Roll and win!',
    emoji: '🎲',
    imageSrc: GAME_IMAGES.dice,
    visual: 'dice',
    choiceA: { value: 'high', label: 'HIGH', icon: '📈' },
    choiceB: { value: 'low', label: 'LOW', icon: '📉' },
    playLabel: 'ROLL DICE',
    play: (bet, choice, mult) => API.playDiceGame(bet, choice, mult),
  },
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
  const [pendingGame, setPendingGame] = useState(null);
  const [showInterstitial, setShowInterstitial] = useState(false);
  const gameLaunchCountRef = useRef(0);

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
      if (response.success && response.user) onUpdateUser(response.user);
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

  const openGame = (gameId) => {
    setView(gameId);
    loadGameSettings();
    if (gameId === 'lucky-triple') {
      setResult(null);
      setGuesses(['', '', '']);
    }
  };

  const handleSelectGame = (gameId) => {
    if (gameId === 'bank') {
      setView('bank');
      return;
    }

    gameLaunchCountRef.current += 1;
    const shouldShowAd = hasInterstitialSlot() &&
      gameLaunchCountRef.current % INTERSTITIAL_FREQUENCY === 0;

    if (shouldShowAd) {
      setPendingGame(gameId);
      setShowInterstitial(true);
      return;
    }

    openGame(gameId);
  };

  const handleInterstitialClose = () => {
    setShowInterstitial(false);
    if (pendingGame) {
      openGame(pendingGame);
      setPendingGame(null);
    }
  };

  const handleGameUpdateUser = (updates) => {
    if (updates.balance !== undefined) {
      applyBalanceUpdate(updates.balance, updates.profit ?? 0);
    } else {
      onUpdateUser(updates);
    }
  };

  const isInGame = Object.keys(GAME_NAMES).includes(view);

  if (!user) {
    return <div className="loading-screen">Loading user data...</div>;
  }

  const predictionConfig = PREDICTION_GAMES[view];

  return (
    <div className="game-container">
      <CasinoBackground />

      <nav className="top-nav">
        <div className="nav-left">
          <button type="button" className="brand-btn" onClick={() => setView('lobby')}>
            <img src={GAME_IMAGES.roulette} alt="" className="brand-btn__img" />
            <span className="brand-btn__text">Lucky Triple Casino</span>
          </button>
        </div>
        <div className="nav-center">
          <button type="button" className={view === 'lobby' ? 'active' : ''} onClick={() => setView('lobby')}>🏠 Lobby</button>
          <button type="button" className={view === 'bank' ? 'active' : ''} onClick={() => setView('bank')}>💳 Wallet</button>
        </div>
        <div className="nav-right">
          <div className={`balance-display ${balanceFlash ? `balance-display--${balanceFlash}` : ''}`}>
            <span className="balance-label">Balance</span>
            <span className="balance-amount">GHS {user?.balance?.toFixed(2) || '0.00'}</span>
          </div>
          <button type="button" onClick={onLogout} className="logout-btn">Logout</button>
        </div>
      </nav>

      {isInGame && view !== 'bank' && (
        <motion.div className="game-breadcrumb" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <button type="button" onClick={() => setView('lobby')} className="game-breadcrumb__back">← Back to lobby</button>
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

          {predictionConfig && (
            <PredictionGameView
              key={view}
              {...predictionConfig}
              userBalance={user.balance || 0}
              gameSettings={gameSettings}
              onUpdateUser={handleGameUpdateUser}
              onPlay={predictionConfig.play}
              onRefreshSettings={loadGameSettings}
            />
          )}

          {view === 'slots' && (
            <SlotsView
              key="slots"
              userBalance={user.balance || 0}
              gameSettings={gameSettings}
              onUpdateUser={handleGameUpdateUser}
              onRefreshSettings={loadGameSettings}
            />
          )}

          {view === 'bank' && (
            <BankView key="bank" user={user} onUpdateUser={onUpdateUser} />
          )}
        </AnimatePresence>
      </main>

      <AdBanner className="game-ad-banner" />
      <AdInterstitial open={showInterstitial} onClose={handleInterstitialClose} />
    </div>
  );
};
