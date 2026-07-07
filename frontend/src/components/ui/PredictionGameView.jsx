import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameArt } from './GameArt';

const OPPOSITE = {
  up: 'bottom',
  bottom: 'up',
  red: 'black',
  black: 'red',
  heads: 'tails',
  tails: 'heads',
  high: 'low',
  low: 'high',
};

const OUTCOME_LABELS = {
  up: '⬆️ UP',
  bottom: '⬇️ BOTTOM',
  red: '🔴 RED',
  black: '⚫ BLACK',
  heads: '🪙 HEADS',
  tails: '✨ TAILS',
  high: '📈 HIGH',
  low: '📉 LOW',
};

export const PredictionGameView = ({
  title,
  subtitle,
  emoji,
  imageSrc,
  visual = 'bottle',
  choiceA,
  choiceB,
  userBalance,
  gameSettings,
  onUpdateUser,
  onPlay,
  playLabel = 'PLAY',
}) => {
  const [bet, setBet] = useState(gameSettings?.minBet || 10);
  const [choice, setChoice] = useState(choiceA.value);
  const [multiplier, setMultiplier] = useState(2);
  const [playing, setPlaying] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [extra, setExtra] = useState(null);

  const handlePlay = async () => {
    const minBet = gameSettings?.minBet || 1;
    const maxBet = gameSettings?.maxBet || 1000;

    if (bet < minBet) {
      alert(`Minimum bet is GHS ${minBet}`);
      return;
    }
    if (userBalance < bet) {
      alert('Insufficient balance. Please deposit funds.');
      return;
    }

    setPlaying(true);
    setSpinning(true);
    setResult(null);
    setExtra(null);

    try {
      await new Promise((r) => setTimeout(r, 1500));
      const gameResult = await onPlay(bet, choice, multiplier);

      if (gameResult.success) {
        setResult(gameResult);
        setExtra(gameResult.diceRoll ?? null);
        if (onUpdateUser) {
          onUpdateUser({ balance: gameResult.newBalance, profit: gameResult.profit });
        }
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Game error occurred');
    } finally {
      setSpinning(false);
      setPlaying(false);
    }
  };

  if (!gameSettings) {
    return <div className="game-view"><div className="loading">Loading game...</div></div>;
  }

  const minBet = gameSettings.minBet || 1;
  const maxBet = gameSettings.maxBet || 1000;
  const potentialWin = (bet * multiplier).toFixed(2);

  const bottleRotation = spinning
    ? 1440
    : result
      ? result.outcome === 'up' ? 0 : result.outcome === 'bottom' ? 180 : 0
      : 0;

  const wheelRotation = spinning ? 1440 + Math.random() * 360 : result ? 720 : 0;

  return (
    <motion.div
      className={`game-view prediction-game prediction-game--${visual}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35 }}
    >
      <div className="game-card">
        <div className="game-card__header-art">
          <GameArt src={imageSrc} alt={title} size="card" visual={visual} />
          <div>
            <h3>{title}</h3>
            <p className="game-subtitle">{subtitle}</p>
          </div>
        </div>

        <div className="prediction-visual">
          <motion.div
            className="prediction-visual__frame"
            animate={
              spinning
                ? visual === 'wheel'
                  ? { rotate: wheelRotation }
                  : visual === 'bottle'
                    ? { rotate: bottleRotation }
                    : visual === 'coin'
                      ? { rotateY: [0, 360, 720] }
                      : { rotate: [0, 15, -15, 0], scale: [1, 1.08, 1] }
                : { rotate: 0, rotateY: 0, scale: 1 }
            }
            transition={{
              duration: spinning ? (visual === 'wheel' ? 2 : 1.5) : 0.5,
              ease: spinning ? 'easeOut' : 'linear',
              repeat: spinning && visual !== 'wheel' && visual !== 'bottle' ? Infinity : 0,
            }}
          >
            <GameArt src={imageSrc} alt={title} size="hero" visual={visual} spinning={spinning} />
          </motion.div>
        </div>

        <AnimatePresence>
          {result && !spinning && (
            <motion.div
              className={`result-message ${result.won ? 'win' : 'lose'}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{ marginBottom: '20px' }}
            >
              {result.won
                ? `🎉 WIN! ${OUTCOME_LABELS[result.outcome] || result.outcome} — +GHS ${Number(result.profit).toFixed(2)} (won GHS ${Number(result.winAmount).toFixed(2)})`
                : `😔 LOST! Landed ${OUTCOME_LABELS[result.outcome] || result.outcome} — -GHS ${Math.abs(Number(result.profit)).toFixed(2)}`}
              {extra && visual === 'dice' && <div className="dice-roll-label">Rolled: {extra}</div>}
              {result.newBalance !== undefined && (
                <div className="new-balance-display">Balance: GHS {Number(result.newBalance).toFixed(2)}</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="spin-controls" style={{ opacity: playing ? 0.5 : 1, pointerEvents: playing ? 'none' : 'auto' }}>
          <div className="control-group">
            <label>1. Make Your Pick</label>
            <div className="button-group">
              <button
                type="button"
                className={`selection-btn ${choice === choiceA.value ? 'active' : ''}`}
                onClick={() => setChoice(choiceA.value)}
              >
                <span className="btn-icon">{choiceA.icon}</span> {choiceA.label}
              </button>
              <button
                type="button"
                className={`selection-btn ${choice === choiceB.value ? 'active' : ''}`}
                onClick={() => setChoice(choiceB.value)}
              >
                <span className="btn-icon">{choiceB.icon}</span> {choiceB.label}
              </button>
            </div>
          </div>

          <div className="control-group">
            <label>2. Choose Multiplier</label>
            <div className="button-group">
              {[2, 3, 4].map((mult) => (
                <button
                  key={mult}
                  type="button"
                  className={`selection-btn ${multiplier === mult ? 'active mult-btn' : ''}`}
                  onClick={() => setMultiplier(mult)}
                >
                  <span className="btn-icon">x{mult}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bet-section">
            <label>3. Bet Amount (GHS)</label>
            <div className="bet-controls">
              <button type="button" onClick={() => setBet(Math.max(minBet, bet - 10))}>-10</button>
              <input
                type="number"
                value={bet}
                onChange={(e) => setBet(Math.max(minBet, Math.min(maxBet, parseFloat(e.target.value) || minBet)))}
                min={minBet}
                max={maxBet}
              />
              <button type="button" onClick={() => setBet(Math.min(maxBet, userBalance, bet + 10))}>+10</button>
            </div>
          </div>

          <div className="potential-win">
            Bet GHS {Number(bet).toFixed(2)} × {multiplier} = <strong>GHS {potentialWin}</strong> if you win
          </div>

          <button type="button" className="play-btn" onClick={handlePlay} disabled={playing}>
            {spinning ? '🔄 Playing...' : `${emoji} ${playLabel}`}
          </button>
        </div>
      </div>
    </motion.div>
  );
};
