import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API } from '../../api-helper';

// ============================================================================
// SPIN THE BOTTLE VIEW
// ============================================================================

export const SpinView = ({
    userBalance,
    gameSettings,
    onUpdateUser
}) => {
    const [bet, setBet] = useState(gameSettings?.minBet || 10);
    const [direction, setDirection] = useState('up');
    const [multiplier, setMultiplier] = useState(2);
    const [playing, setPlaying] = useState(false);
    const [spinResult, setSpinResult] = useState(null);
    const [spinning, setSpinning] = useState(false);

    const handleSpin = async () => {
        if (bet < (gameSettings?.minBet || 1)) {
            alert(`Minimum bet is GHS ${gameSettings?.minBet || 1}`);
            return;
        }

        if (userBalance < bet) {
            alert('Insufficient balance. Please deposit funds.');
            return;
        }

        setPlaying(true);
        setSpinResult(null);
        setSpinning(true);

        try {
            // Simulate spinning time before API call
            await new Promise(r => setTimeout(r, 1500));

            const gameResult = await API.playSpinGame(bet, direction, multiplier);

            if (gameResult.success) {
                setSpinResult(gameResult);
                if (onUpdateUser) {
                    onUpdateUser({ balance: gameResult.newBalance });
                }
            }
        } catch (error) {
            alert(error.response?.data?.error || 'Game error occurred');
        } finally {
            setSpinning(false);
            setPlaying(false);
        }
    };

    const bottleRotation = spinning
        ? 1440 // Spin 4 times
        : spinResult
            ? spinResult.outcome === 'up' ? 360 : 540 // Point up or down
            : 0;

    return (
        <motion.div
            className="game-view spin-game"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
        >
            <div className="game-card">
                <h3>🍾 Spin the Bottle</h3>
                <p className="game-subtitle">Predict where the bottle will point!</p>

                {/* BOTTLE ANIMATION */}
                <div className="bottle-container" style={{
                    height: '250px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    margin: '20px 0',
                    perspective: '1000px'
                }}>

                    <motion.div
                        animate={{ rotate: bottleRotation }}
                        transition={{
                            duration: spinning ? 1.5 : 0.5,
                            ease: spinning ? "linear" : "easeOut",
                            repeat: spinning ? Infinity : 0
                        }}
                        style={{
                            fontSize: '100px',
                            filter: 'drop-shadow(0px 10px 10px rgba(0,0,0,0.3))'
                        }}
                    >
                        🍾
                    </motion.div>
                </div>

                {/* RESULTS OVERLAY */}
                <AnimatePresence>
                    {spinResult && !spinning && (
                        <motion.div
                            className={`result-message ${spinResult.won ? 'win' : 'lose'}`}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            style={{ marginBottom: '20px' }}
                        >
                            {spinResult.won
                                ? `🎉 WINNER! The bottle pointed ${spinResult.outcome.toUpperCase()}! (+GHS ${spinResult.profit.toFixed(2)})`
                                : `😔 LOST! The bottle pointed ${spinResult.outcome.toUpperCase()}! (-GHS ${Math.abs(spinResult.profit).toFixed(2)})`
                            }
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* GAME CONTROLS */}
                <div className="spin-controls" style={{ opacity: playing ? 0.5 : 1, pointerEvents: playing ? 'none' : 'auto' }}>

                    {/* DIRECTION PICKER */}
                    <div className="control-group">
                        <label>1. Predict Direction</label>
                        <div className="button-group">
                            <button
                                className={direction === 'up' ? 'active selection-btn' : 'selection-btn'}
                                onClick={() => setDirection('up')}
                                style={{ backgroundColor: direction === 'up' ? '#4CAF50' : '#333' }}
                            >
                                ⬆️ UP
                            </button>
                            <button
                                className={direction === 'bottom' ? 'active selection-btn' : 'selection-btn'}
                                onClick={() => setDirection('bottom')}
                                style={{ backgroundColor: direction === 'bottom' ? '#4CAF50' : '#333' }}
                            >
                                ⬇️ BOTTOM
                            </button>
                        </div>
                    </div>

                    {/* MULTIPLIER PICKER */}
                    <div className="control-group">
                        <label>2. Choose Multiplier {(gameSettings?.spinWinChances) &&
                            <span style={{ fontSize: '0.8rem', color: '#888' }}>
                                (Win Chance: {gameSettings.spinWinChances[`x${multiplier}`]}%)
                            </span>
                        }</label>
                        <div className="button-group">
                            {[2, 3, 4].map(mult => (
                                <button
                                    key={mult}
                                    className={multiplier === mult ? 'active selection-btn' : 'selection-btn'}
                                    onClick={() => setMultiplier(mult)}
                                    style={{ backgroundColor: multiplier === mult ? '#2196F3' : '#333' }}
                                >
                                    x{mult}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* BET AMOUNT */}
                    <div className="bet-section" style={{ marginTop: '20px' }}>
                        <label>3. Bet Amount (GHS)</label>
                        <div className="bet-controls">
                            <button onClick={() => setBet(Math.max((gameSettings?.minBet || 1), bet - 10))}>-10</button>
                            <input
                                type="number"
                                value={bet}
                                onChange={(e) => setBet(Math.max((gameSettings?.minBet || 1), parseInt(e.target.value) || (gameSettings?.minBet || 1)))}
                                min={gameSettings?.minBet || 1}
                                max={gameSettings?.maxBet || 1000}
                            />
                            <button onClick={() => setBet(Math.min((gameSettings?.maxBet || 1000), userBalance, bet + 10))}>+10</button>
                        </div>
                    </div>

                    <div style={{ textAlign: 'center', marginTop: '10px', color: '#FFD700', fontWeight: 'bold' }}>
                        Potential Win: GHS {(bet * multiplier).toFixed(2)}
                    </div>

                    {/* PLAY BUTTON */}
                    <button
                        className="play-btn"
                        onClick={handleSpin}
                        disabled={playing}
                        style={{ width: '100%', marginTop: '20px', padding: '15px', fontSize: '1.2rem' }}
                    >
                        {spinning ? '🔄 Spinning...' : '🍾 SPIN NOW'}
                    </button>
                </div>
            </div>
        </motion.div>
    );
};
