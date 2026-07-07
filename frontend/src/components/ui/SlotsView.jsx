import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API } from '../../api-helper';

const SLOT_SYMBOLS = [
  { value: '🍒', label: 'Cherry' },
  { value: '🍋', label: 'Lemon' },
  { value: '🔔', label: 'Bell' },
  { value: '💎', label: 'Diamond' },
  { value: '7️⃣', label: 'Lucky 7' },
];

export const SlotsView = ({ userBalance, gameSettings, onUpdateUser, onRefreshSettings }) => {
  const [bet, setBet] = useState(gameSettings?.minBet || 10);
  const [symbol, setSymbol] = useState('🍒');
  const [multiplier, setMultiplier] = useState(2);
  const [spinning, setSpinning] = useState(false);
  const [reels, setReels] = useState(['🎰', '🎰', '🎰']);
  const [result, setResult] = useState(null);

  useEffect(() => {
    onRefreshSettings?.();
  }, []);

  const handleSpin = async () => {
    const minBet = gameSettings?.minBet || 1;
    if (bet < minBet) {
      alert(`Minimum bet is GHS ${minBet}`);
      return;
    }
    if (userBalance < bet) {
      alert('Insufficient balance. Please deposit funds.');
      return;
    }

    setSpinning(true);
    setResult(null);

    const spinInterval = setInterval(() => {
      setReels([
        SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)].value,
        SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)].value,
        SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)].value,
      ]);
    }, 80);

    try {
      await onRefreshSettings?.();
      const gameResult = await API.playSlotsGame(bet, symbol, multiplier);
      await new Promise((r) => setTimeout(r, 2000));
      clearInterval(spinInterval);

      if (gameResult.success) {
        setReels(gameResult.reels);
        setResult(gameResult);
        onUpdateUser({ balance: gameResult.newBalance, profit: gameResult.profit });
      }
    } catch (error) {
      clearInterval(spinInterval);
      alert(error.response?.data?.error || 'Slots error occurred');
    } finally {
      setSpinning(false);
    }
  };

  if (!gameSettings) {
    return <div className="game-view"><div className="loading">Loading slots...</div></div>;
  }

  const minBet = gameSettings.minBet || 1;
  const maxBet = gameSettings.maxBet || 1000;
  const potentialWin = (bet * multiplier).toFixed(2);

  return (
    <motion.div
      className="game-view slots-game"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35 }}
    >
      <div className="game-card">
        <div className="game-card__header-art">
          <span className="game-card__emoji">🎰</span>
          <div>
            <h3>Lucky Slots</h3>
            <p className="game-subtitle">Pick your symbol, choose a multiplier, then spin!</p>
          </div>
        </div>

        <div className="slots-machine">
          <div className="slots-machine__lights">✨ 💫 ✨</div>
          <div className="slots-reels">
            {reels.map((sym, i) => (
              <motion.div
                key={i}
                className={`slots-reel ${spinning ? 'slots-reel--spinning' : ''}`}
                animate={spinning ? { y: [0, -10, 0] } : {}}
                transition={{ duration: 0.12, repeat: spinning ? Infinity : 0, delay: i * 0.05 }}
              >
                <span className="slots-reel__symbol">{sym}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {result && !spinning && (
            <motion.div
              className={`result-message ${result.won ? 'win' : 'lose'}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              {result.won
                ? `🎉 MATCH! ${symbol}${symbol}${symbol} — +GHS ${result.winAmount.toFixed(2)} (×${multiplier})`
                : `😔 No triple ${symbol} — lost GHS ${Math.abs(result.profit).toFixed(2)}`}
              {result.newBalance !== undefined && (
                <div className="new-balance-display">Balance: GHS {Number(result.newBalance).toFixed(2)}</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="spin-controls" style={{ opacity: spinning ? 0.6 : 1, pointerEvents: spinning ? 'none' : 'auto' }}>
          <div className="control-group control-group--pick">
            <label>1. Pick Your Symbol</label>
            <div className="button-group slots-symbol-grid">
              {SLOT_SYMBOLS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`selection-btn pick-btn slots-symbol-btn ${symbol === item.value ? 'active pick-slots' : ''}`}
                  onClick={() => setSymbol(item.value)}
                >
                  <span className="btn-icon">{item.value}</span>
                  <span className="btn-label">{item.label}</span>
                  {symbol === item.value && <span className="pick-check">✓</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="control-group">
            <label>2. Choose Multiplier</label>
            <div className="button-group">
              {[2, 3, 4].map((mult) => (
                <button
                  key={mult}
                  type="button"
                  className={`selection-btn mult-btn ${multiplier === mult ? 'active pick-mult' : ''}`}
                  onClick={() => setMultiplier(mult)}
                >
                  <span className="btn-icon">×{mult}</span>
                  {multiplier === mult && <span className="pick-check">✓</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="bet-section">
            <label>3. Bet Amount (GHS)</label>
            <div className="bet-controls">
              <button type="button" onClick={() => setBet(Math.max(minBet, bet - 10))} disabled={spinning}>-10</button>
              <input
                type="number"
                value={bet}
                onChange={(e) => setBet(Math.max(minBet, Math.min(maxBet, parseFloat(e.target.value) || minBet)))}
                min={minBet}
                max={maxBet}
                disabled={spinning}
              />
              <button type="button" onClick={() => setBet(Math.min(maxBet, userBalance, bet + 10))} disabled={spinning}>+10</button>
            </div>
          </div>

          <div className="potential-win">
            Bet GHS {Number(bet).toFixed(2)} × {multiplier} = <strong>GHS {potentialWin}</strong> if you hit 3× {symbol}
          </div>

          <button type="button" className="play-btn slots-spin-btn" onClick={handleSpin} disabled={spinning}>
            {spinning ? '🎰 Spinning...' : '🎰 SPIN!'}
          </button>
        </div>
      </div>
    </motion.div>
  );
};
