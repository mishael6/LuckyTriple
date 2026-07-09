import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameVisual } from './GameVisuals';

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

const CHOICE_ACTIVE_CLASS = {
  up: 'pick-up',
  bottom: 'pick-bottom',
  red: 'pick-red',
  black: 'pick-black',
  heads: 'pick-heads',
  tails: 'pick-tails',
  high: 'pick-high',
  low: 'pick-low',
};

const ANIM_DURATION_MS = {
  bottle: 2200,
  wheel: 2800,
  coin: 2000,
  dice: 1800,
};

export const PredictionGameView = ({
  title,
  subtitle,
  emoji,
  visual = 'bottle',
  choiceA,
  choiceB,
  userBalance,
  gameSettings,
  onUpdateUser,
  onPlay,
  onRefreshSettings,
  playLabel = 'PLAY',
}) => {
  const [bet, setBet] = useState(gameSettings?.minBet || 10);
  const [choice, setChoice] = useState(choiceA.value);
  const [multiplier, setMultiplier] = useState(2);
  const [playing, setPlaying] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [displayDice, setDisplayDice] = useState([1, 1]);
  const [rouletteIdle, setRouletteIdle] = useState(visual === 'wheel');

  useEffect(() => {
    if (gameSettings?.minBet) setBet((b) => Math.max(gameSettings.minBet, b));
  }, [gameSettings?.minBet]);

  useEffect(() => {
    setRouletteIdle(visual === 'wheel');
    setResult(null);
    setDisplayDice([1, 1]);
    onRefreshSettings?.();
  }, [visual]);

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
    if (!onPlay) {
      alert('Game is not configured correctly. Please refresh.');
      return;
    }

    setPlaying(true);
    setSpinning(visual !== 'wheel');
    setResult(null);
    setRouletteIdle(false);

    if (visual === 'dice') {
      const rollInterval = setInterval(() => {
        setDisplayDice([
          Math.floor(Math.random() * 6) + 1,
          Math.floor(Math.random() * 6) + 1,
        ]);
      }, 90);
      try {
        await onRefreshSettings?.();
        const gameResult = await onPlay(bet, choice, multiplier);
        if (gameResult.success) {
          const rolls = gameResult.diceRolls || [gameResult.diceRoll || 1, gameResult.diceRoll || 1];
          setResult(gameResult);
          await new Promise((r) => setTimeout(r, ANIM_DURATION_MS.dice));
          clearInterval(rollInterval);
          setDisplayDice(rolls);
          if (onUpdateUser) onUpdateUser({ balance: gameResult.newBalance, profit: gameResult.profit });
        } else {
          clearInterval(rollInterval);
        }
      } catch (error) {
        clearInterval(rollInterval);
        alert(error.response?.data?.error || 'Game error occurred');
      } finally {
        setSpinning(false);
        setPlaying(false);
      }
      return;
    }

    try {
      await onRefreshSettings?.();
      const gameResult = await onPlay(bet, choice, multiplier);

      if (gameResult.success) {
        setResult(gameResult);
        if (visual === 'wheel') setSpinning(true);
        await new Promise((r) => setTimeout(r, ANIM_DURATION_MS[visual] || 2000));
        if (onUpdateUser) {
          onUpdateUser({ balance: gameResult.newBalance, profit: gameResult.profit });
        }
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Game error occurred');
    } finally {
      setSpinning(false);
      setPlaying(false);
      if (visual === 'wheel') setRouletteIdle(true);
    }
  };

  if (!gameSettings) {
    return <div className="game-view"><div className="loading">Loading game...</div></div>;
  }

  const minBet = gameSettings.minBet || 1;
  const maxBet = gameSettings.maxBet || 1000;
  const potentialWin = (bet * multiplier).toFixed(2);
  const pickClass = (value) => CHOICE_ACTIVE_CLASS[value] || 'pick-default';

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
          <span className="game-card__emoji">{emoji}</span>
          <div>
            <h3>{title}</h3>
            <p className="game-subtitle">{subtitle}</p>
          </div>
        </div>

        <div className="prediction-visual">
          <GameVisual
            type={visual}
            spinning={spinning}
            outcome={result?.outcome}
            idleSpin={rouletteIdle}
            diceRolls={displayDice}
          />
        </div>

        <AnimatePresence>
          {result && (
            <motion.div
              className={`result-message ${result.won ? 'win' : 'lose'}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: spinning ? 0.6 : 1 }}
              style={{ marginBottom: '20px' }}
            >
              {result.won
                ? `🎉 WIN! ${OUTCOME_LABELS[result.outcome] || result.outcome} — +GHS ${Number(result.profit).toFixed(2)} (won GHS ${Number(result.winAmount).toFixed(2)})`
                : `😔 LOST! Landed ${OUTCOME_LABELS[result.outcome] || result.outcome} — -GHS ${Math.abs(Number(result.profit)).toFixed(2)}`}
              {visual === 'dice' && displayDice.length === 2 && (
                <div className="dice-roll-label">Rolled: {displayDice[0]} + {displayDice[1]} = {displayDice[0] + displayDice[1]}</div>
              )}
              {result.newBalance !== undefined && (
                <div className="new-balance-display">Balance: GHS {Number(result.newBalance).toFixed(2)}</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="spin-controls" style={{ opacity: playing ? 0.6 : 1, pointerEvents: playing ? 'none' : 'auto' }}>
          <div className="control-group control-group--pick">
            <label>1. Make Your Pick</label>
            <div className="button-group">
              <button
                type="button"
                className={`selection-btn pick-btn ${choice === choiceA.value ? `active ${pickClass(choiceA.value)}` : ''}`}
                onClick={() => setChoice(choiceA.value)}
              >
                <span className="btn-icon">{choiceA.icon}</span>
                <span className="btn-label">{choiceA.label}</span>
                {choice === choiceA.value && <span className="pick-check">✓ SELECTED</span>}
              </button>
              <button
                type="button"
                className={`selection-btn pick-btn ${choice === choiceB.value ? `active ${pickClass(choiceB.value)}` : ''}`}
                onClick={() => setChoice(choiceB.value)}
              >
                <span className="btn-icon">{choiceB.icon}</span>
                <span className="btn-label">{choiceB.label}</span>
                {choice === choiceB.value && <span className="pick-check">✓ SELECTED</span>}
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
