import { motion } from 'framer-motion';


// ============================================================================
// GAME VIEW
// ============================================================================

export const GameView = ({ 
  guesses, bet, result, playing, showCelebration, gameSettings,
  onGuessChange, onBetChange, onPlay, onPlayAgain, userBalance 
}) => {
  if (!gameSettings) {
    return <div className="game-view"><div className="loading">Loading game...</div></div>;
  }

  return (
    <motion.div 
      className="game-view"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="game-card">
        <h3>Pick Your Lucky Numbers</h3>
        <p className="game-subtitle">Choose 3 numbers between 0-9</p>

        <div className="numbers-container">
          {guesses.map((guess, index) => (
            <motion.div 
              key={index}
              className="number-input-wrapper"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <input
                type="number"
                className="number-input"
                value={guess}
                onChange={(e) => onGuessChange(index, e.target.value)}
                min="0"
                max="9"
                disabled={playing || result}
                placeholder="?"
              />
            </motion.div>
          ))}
        </div>

        {result && (
          <motion.div 
            className="result-display"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <h4>Winning Numbers</h4>
            <div className="winning-numbers">
              {result.winningNumbers.map((num, index) => (
                <div 
                  key={index}
                  className={`winning-number ${parseInt(guesses[index]) === num ? 'match' : ''}`}
                >
                  {num}
                </div>
              ))}
            </div>
            
            <div className={`result-message ${result.profit > 0 ? 'win' : 'lose'}`}>
              {result.matches === 3 && '🎉 JACKPOT! All 3 Correct!'}
              {result.matches === 2 && '🌟 Great! 2 Correct!'}
              {result.matches === 1 && '👍 Nice! 1 Correct!'}
              {result.matches === 0 && '😔 No matches. Try again!'}
            </div>

            <div className="profit-display">
              {result.profit > 0 ? (
                <span className="win-amount">+GHS {result.profit.toFixed(2)}</span>
              ) : (
                <span className="lose-amount">-GHS {bet.toFixed(2)}</span>
              )}
            </div>
          </motion.div>
        )}

        <div className="bet-section">
          <label>Bet Amount (GHS {gameSettings.minBet} - GHS {gameSettings.maxBet})</label>
          <div className="bet-controls">
            <button 
              onClick={() => onBetChange(Math.max(gameSettings.minBet, bet - 10))} 
              disabled={playing || result}
            >
              -10
            </button>
            <input
              type="number"
              value={bet}
              onChange={(e) => onBetChange(Math.max(gameSettings.minBet, Math.min(gameSettings.maxBet, parseInt(e.target.value) || gameSettings.minBet)))}
              min={gameSettings.minBet}
              max={Math.min(gameSettings.maxBet, userBalance || 0)}
              disabled={playing || result}
            />
            <button 
              onClick={() => onBetChange(Math.min(Math.min(gameSettings.maxBet, userBalance || 0), bet + 10))} 
              disabled={playing || result}
            >
              +10
            </button>
          </div>
        </div>

        <div className="payout-info">
          <div className="payout-row">
            <span>3 Matches</span>
            <span className="payout-value">
              {gameSettings.payoutMultipliers.threeMatches}x (GHS {(bet * gameSettings.payoutMultipliers.threeMatches).toFixed(0)})
            </span>
          </div>
          <div className="payout-row">
            <span>2 Matches</span>
            <span className="payout-value">
              {gameSettings.payoutMultipliers.twoMatches}x (GHS {(bet * gameSettings.payoutMultipliers.twoMatches).toFixed(0)})
            </span>
          </div>
          <div className="payout-row">
            <span>1 Match</span>
            <span className="payout-value">
              {gameSettings.payoutMultipliers.oneMatch}x (GHS {(bet * gameSettings.payoutMultipliers.oneMatch).toFixed(0)})
            </span>
          </div>
        </div>

        {!result ? (
          <button 
            className="play-btn"
            onClick={onPlay}
            disabled={playing || guesses.some(g => g === '')}
          >
            {playing ? '🎲 Rolling...' : '🎲 Play Now'}
          </button>
        ) : (
          <button className="play-again-btn" onClick={onPlayAgain}>
            Play Again
          </button>
        )}
      </div>

      {showCelebration && (
        <div className="celebration-overlay">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            className="celebration-text"
          >
            🎊 WINNER! 🎊
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};
