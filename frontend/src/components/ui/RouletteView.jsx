import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API } from '../../api-helper';

const RED_NUMS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

const getNumberColor = (n) => {
  if (n === 0) return 'green';
  return RED_NUMS.includes(n) ? 'red' : 'black';
};

export const RouletteView = ({ userBalance, gameSettings, onUpdateUser }) => {
  const [bet, setBet] = useState(gameSettings?.minBet || 10);
  const [betType, setBetType] = useState('red');
  const [betNumber, setBetNumber] = useState(7);
  const [spinning, setSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [result, setResult] = useState(null);

  const handleSpin = async () => {
    if (bet < (gameSettings?.minBet || 1)) {
      alert(`Minimum bet is GHS ${gameSettings?.minBet || 1}`);
      return;
    }
    if (userBalance < bet) {
      alert('Insufficient balance. Please deposit funds.');
      return;
    }

    setSpinning(true);
    setResult(null);
    setWheelRotation((prev) => prev + 1440 + Math.random() * 360);

    try {
      await new Promise((r) => setTimeout(r, 2000));
      const gameResult = await API.playRouletteGame(bet, betType, betType === 'number' ? betNumber : undefined);

      if (gameResult.success) {
        setResult(gameResult);
        onUpdateUser({ balance: gameResult.newBalance, profit: gameResult.profit });
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Roulette error occurred');
    } finally {
      setSpinning(false);
    }
  };

  if (!gameSettings) {
    return <div className="game-view"><div className="loading">Loading roulette...</div></div>;
  }

  const chances = gameSettings.rouletteWinChances || {};
  const payouts = gameSettings.roulettePayouts || {};

  return (
    <motion.div
      className="game-view roulette-game"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35 }}
    >
      <div className="game-card">
        <h3>🎡 Golden Roulette</h3>
        <p className="game-subtitle">Pick red, black, or your lucky number!</p>

        <div className="roulette-stage">
          <motion.div
            className="roulette-wheel"
            animate={{ rotate: wheelRotation }}
            transition={{ duration: spinning ? 2 : 0.5, ease: spinning ? 'easeOut' : 'linear' }}
          >
            <div className="roulette-wheel__inner">🎡</div>
            <div className="roulette-wheel__ring" />
          </motion.div>
          <div className="roulette-ball">⚪</div>
        </div>

        <AnimatePresence>
          {result && (
            <motion.div
              className={`roulette-result ${result.won ? 'win' : 'lose'}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <span className={`roulette-number roulette-number--${result.spinColor}`}>
                {result.spinNumber}
              </span>
              <span>{result.won ? `🎉 Won GHS ${result.winAmount.toFixed(2)}!` : `😔 Lost GHS ${Math.abs(result.profit).toFixed(2)}`}</span>
              {result.newBalance !== undefined && (
                <span className="new-balance-display">Balance: GHS {Number(result.newBalance).toFixed(2)}</span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="roulette-bets">
          <button
            type="button"
            className={`roulette-bet-btn roulette-bet-btn--red ${betType === 'red' ? 'active' : ''}`}
            onClick={() => setBetType('red')}
            disabled={spinning}
          >
            🔴 Red ({payouts.color || 2}x · {chances.color || 48}%)
          </button>
          <button
            type="button"
            className={`roulette-bet-btn roulette-bet-btn--black ${betType === 'black' ? 'active' : ''}`}
            onClick={() => setBetType('black')}
            disabled={spinning}
          >
            ⚫ Black ({payouts.color || 2}x · {chances.color || 48}%)
          </button>
          <button
            type="button"
            className={`roulette-bet-btn roulette-bet-btn--number ${betType === 'number' ? 'active' : ''}`}
            onClick={() => setBetType('number')}
            disabled={spinning}
          >
            🎯 Number ({payouts.number || 35}x · {chances.number || 3}%)
          </button>
        </div>

        {betType === 'number' && (
          <div className="roulette-number-picker">
            <label>Pick number (0–36)</label>
            <input
              type="number"
              min="0"
              max="36"
              value={betNumber}
              onChange={(e) => setBetNumber(Math.min(36, Math.max(0, parseInt(e.target.value) || 0)))}
              disabled={spinning}
            />
            <span className={`roulette-preview roulette-number--${getNumberColor(betNumber)}`}>
              {betNumber}
            </span>
          </div>
        )}

        <div className="bet-section">
          <label>Your Bet (GHS)</label>
          <div className="bet-controls">
            <button type="button" onClick={() => setBet(Math.max(gameSettings.minBet, bet - 10))} disabled={spinning}>-10</button>
            <input
              type="number"
              value={bet}
              onChange={(e) => setBet(parseFloat(e.target.value) || gameSettings.minBet)}
              min={gameSettings.minBet}
              max={gameSettings.maxBet}
              disabled={spinning}
            />
            <button type="button" onClick={() => setBet(Math.min(gameSettings.maxBet, bet + 10))} disabled={spinning}>+10</button>
          </div>
        </div>

        <button type="button" className="play-btn" onClick={handleSpin} disabled={spinning}>
          {spinning ? '🎡 Spinning...' : '🎡 SPIN THE WHEEL!'}
        </button>
      </div>
    </motion.div>
  );
};
