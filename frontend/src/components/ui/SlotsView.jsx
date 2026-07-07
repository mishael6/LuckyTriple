import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API } from '../../api-helper';
import { GameArt } from './GameArt';
import { GAME_IMAGES } from '../../assets/gameAssets';

export const SlotsView = ({ userBalance, gameSettings, onUpdateUser }) => {
  const [bet, setBet] = useState(gameSettings?.minBet || 10);
  const [spinning, setSpinning] = useState(false);
  const [reels, setReels] = useState(['🎰', '🎰', '🎰']);
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

    const spinSymbols = ['🍒', '🍋', '🔔', '💎', '7️⃣'];
    const interval = setInterval(() => {
      setReels([
        spinSymbols[Math.floor(Math.random() * spinSymbols.length)],
        spinSymbols[Math.floor(Math.random() * spinSymbols.length)],
        spinSymbols[Math.floor(Math.random() * spinSymbols.length)],
      ]);
    }, 80);

    try {
      await new Promise((r) => setTimeout(r, 1800));
      const gameResult = await API.playSlotsGame(bet);
      clearInterval(interval);

      if (gameResult.success) {
        setReels(gameResult.reels);
        setResult(gameResult);
        onUpdateUser({ balance: gameResult.newBalance, profit: gameResult.profit });
      }
    } catch (error) {
      clearInterval(interval);
      alert(error.response?.data?.error || 'Slots error occurred');
    } finally {
      setSpinning(false);
    }
  };

  if (!gameSettings) {
    return <div className="game-view"><div className="loading">Loading slots...</div></div>;
  }

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
          <GameArt src={GAME_IMAGES.slots} alt="Lucky Slots" size="card" />
          <div>
            <h3>Lucky Slots</h3>
            <p className="game-subtitle">Spin the reels and hit the jackpot!</p>
          </div>
        </div>

        <motion.div
          animate={spinning ? { scale: [1, 1.04, 1], rotate: [0, 2, -2, 0] } : {}}
          transition={{ duration: 0.8, repeat: spinning ? Infinity : 0 }}
        >
          <GameArt src={GAME_IMAGES.slots} alt="Slot machine" size="hero" visual="slots" spinning={spinning} />
        </motion.div>

        <div className="slots-machine">
          <div className="slots-machine__lights">✨ 💫 ✨</div>
          <div className="slots-reels">
            {reels.map((symbol, i) => (
              <motion.div
                key={i}
                className={`slots-reel ${spinning ? 'slots-reel--spinning' : ''}`}
                animate={spinning ? { y: [0, -8, 0] } : {}}
                transition={{ duration: 0.15, repeat: spinning ? Infinity : 0, delay: i * 0.05 }}
              >
                <span className="slots-reel__symbol">{symbol}</span>
              </motion.div>
            ))}
          </div>
          <div className="slots-machine__handle">🎲</div>
        </div>

        <AnimatePresence>
          {result && (
            <motion.div
              className={`result-message ${result.won ? 'win' : 'lose'}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              {result.won
                ? `🎉 ${result.winTier === 'jackpot' ? 'JACKPOT!' : 'Winner!'} +GHS ${result.winAmount.toFixed(2)} (${result.multiplier}x)`
                : `😔 No match — lost GHS ${Math.abs(result.profit).toFixed(2)}`}
              {result.newBalance !== undefined && (
                <div className="new-balance-display">Balance: GHS {Number(result.newBalance).toFixed(2)}</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="slots-payouts">
          <span>💎 Jackpot {gameSettings.slotsPayouts?.jackpot || 50}x</span>
          <span>🔔 3-of-kind {gameSettings.slotsPayouts?.threeOfKind || 10}x</span>
          <span>🍒 2-of-kind {gameSettings.slotsPayouts?.twoOfKind || 2}x</span>
        </div>

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

        <button type="button" className="play-btn slots-spin-btn" onClick={handleSpin} disabled={spinning}>
          {spinning ? '🎰 Spinning...' : '🎰 SPIN!'}
        </button>
      </div>
    </motion.div>
  );
};
