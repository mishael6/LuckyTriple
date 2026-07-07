import { motion } from 'framer-motion';
import { GAME_IMAGES } from '../../assets/gameAssets';

const FLOATING_STICKERS = ['🎰', '🃏', '💰', '🎲', '🍀', '💎', '🎉', '⭐', '🔥', '👑', '🪙', '🍾'];

const GAMES = [
  { id: 'lucky-triple', title: 'Lucky Triple', emoji: '🎰', image: GAME_IMAGES['lucky-triple'], sticker: '🔥 HOT', description: 'Pick 3 digits — match 2 or 3 to win BIG!', tag: '⭐ Popular', accent: 'gold' },
  { id: 'spin', title: 'Spin the Bottle', emoji: '🍾', image: GAME_IMAGES.spin, sticker: '⚡ FAST', description: 'Up or down + x2/x3/x4 multiplier!', tag: '🎯 Classic', accent: 'emerald' },
  { id: 'roulette', title: 'Golden Roulette', emoji: '🎡', image: GAME_IMAGES.roulette, sticker: '👑 VIP', description: 'Red or black — pick your multiplier!', tag: '🎡 Wheel', accent: 'violet' },
  { id: 'coin', title: 'Coin Flip', emoji: '🪙', image: GAME_IMAGES.coin, sticker: '💫 NEW', description: 'Heads or tails — flip to win!', tag: '🪙 Quick', accent: 'gold' },
  { id: 'dice', title: 'Dice Duel', emoji: '🎲', image: GAME_IMAGES.dice, sticker: '🎲 NEW', description: 'High or low — roll the dice!', tag: '🎲 Luck', accent: 'emerald' },
  { id: 'slots', title: 'Lucky Slots', emoji: '🎰', image: GAME_IMAGES.slots, sticker: '💎 JACKPOT', description: 'Cherries, bells & mega jackpots!', tag: '🎉 Slots', accent: 'ruby' },
];

const isGameLive = (gameId, gameSettings) => {
  if (!gameSettings?.gamesEnabled) return true;
  const map = {
    'lucky-triple': gameSettings.gamesEnabled.luckyTriple,
    spin: gameSettings.gamesEnabled.spin,
    slots: gameSettings.gamesEnabled.slots,
    roulette: gameSettings.gamesEnabled.roulette,
    coin: gameSettings.gamesEnabled.coin,
    dice: gameSettings.gamesEnabled.dice,
  };
  return map[gameId] !== false;
};

export const CasinoLobby = ({ onSelectGame, gameSettings }) => {
  const difficulty = gameSettings?.difficulty || 'medium';
  const difficultyEmoji = { easy: '😊', medium: '🎲', hard: '🔥' }[difficulty] || '🎲';

  return (
    <motion.div className="casino-lobby casino-lobby--fun" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.35 }}>
      <div className="lobby-stickers" aria-hidden="true">
        {FLOATING_STICKERS.map((sticker, i) => (
          <motion.span key={i} className="lobby-sticker" style={{ left: `${(i * 9 + 3) % 95}%`, top: `${(i * 13 + 5) % 80}%` }} animate={{ y: [0, -12, 0], rotate: [0, 10, -10, 0] }} transition={{ duration: 3 + i * 0.3, repeat: Infinity, delay: i * 0.2 }}>
            {sticker}
          </motion.span>
        ))}
      </div>

      <header className="casino-lobby__hero">
        <motion.div className="casino-lobby__jackpot-banner" animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 2, repeat: Infinity }}>
          💰 JACKPOT ZONE 💰
        </motion.div>
        <motion.p className="casino-lobby__eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>🎉 6 games · Win big · Play now 🎉</motion.p>
        <h1 className="casino-lobby__title">🎰 Pick Your Game 🎰</h1>
        <p className="casino-lobby__subtitle">🃏 Spin · Flip · Roll · Slots — all with Payloqa wallet 💳</p>
        {gameSettings && (
          <div className="casino-lobby__meta">
            <span>💵 Min GHS {gameSettings.minBet}</span>
            <span className="casino-lobby__dot" />
            <span>💎 Max GHS {gameSettings.maxBet}</span>
            <span className="casino-lobby__dot" />
            <span>{difficultyEmoji} {difficulty}</span>
          </div>
        )}
      </header>

      <div className="casino-lobby__grid casino-lobby__grid--6">
        {GAMES.map((game, index) => {
          const live = isGameLive(game.id, gameSettings);
          return (
            <motion.article
              key={game.id}
              className={`game-card game-card--fun game-card--${game.accent} ${live ? '' : 'game-card--disabled'}`}
              initial={{ opacity: 0, y: 24, rotate: -2 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ delay: 0.06 * index, duration: 0.4 }}
              whileHover={live ? { y: -8, scale: 1.03, rotate: 1 } : {}}
              whileTap={live ? { scale: 0.97 } : {}}
              onClick={() => live && onSelectGame(game.id)}
              role={live ? 'button' : 'presentation'}
              tabIndex={live ? 0 : -1}
            >
              <div className="game-card__glow" />
              <span className="game-card__sticker">{game.sticker}</span>
              <span className="game-card__tag">{game.tag}</span>
              <div className="game-card__art">
                <img src={game.image} alt={game.title} className="game-card__image" />
              </div>
              <h3 className="game-card__title">{game.title}</h3>
              <p className="game-card__desc">{game.description}</p>
              <button type="button" className="game-card__cta" disabled={!live} onClick={(e) => { e.stopPropagation(); if (live) onSelectGame(game.id); }}>
                {live ? `🎮 Play ${game.emoji}` : '🔒 Disabled'}
              </button>
            </motion.article>
          );
        })}
      </div>

      <motion.div className="casino-lobby__trust" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
        <div className="trust-pill">🔒 Payloqa Secure</div>
        <div className="trust-pill">📱 Mobile Money</div>
        <div className="trust-pill">💸 Fast Withdrawals</div>
        <div className="trust-pill">🎁 Refer & Earn</div>
      </motion.div>
    </motion.div>
  );
};
