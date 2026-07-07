import { motion } from 'framer-motion';

const FLOATING_STICKERS = ['🎰', '🃏', '💰', '🎲', '🍀', '💎', '🎉', '⭐', '🔥', '👑'];

const GAMES = [
  {
    id: 'lucky-triple',
    title: 'Lucky Triple',
    emoji: '🎰',
    sticker: '🔥 HOT',
    description: 'Pick 3 lucky digits — match 2 or 3 and win BIG!',
    tag: '⭐ Popular',
    accent: 'gold',
    icon: '7️⃣7️⃣7️⃣',
  },
  {
    id: 'spin',
    title: 'Spin the Bottle',
    emoji: '🍾',
    sticker: '⚡ FAST',
    description: 'Up or down? Pick your multiplier and spin!',
    tag: '🎯 Skill',
    accent: 'emerald',
    icon: '🍾',
  },
  {
    id: 'slots',
    title: 'Lucky Slots',
    emoji: '🎰',
    sticker: '💎 NEW',
    description: 'Cherries, bells & jackpots — spin to win!',
    tag: '🎉 Jackpot',
    accent: 'ruby',
    icon: '🍒💎7️⃣',
  },
  {
    id: 'roulette',
    title: 'Golden Roulette',
    emoji: '🎡',
    sticker: '👑 VIP',
    description: 'Red, black, or your lucky number on the wheel!',
    tag: '🎡 Classic',
    accent: 'violet',
    icon: '🔴⚫🟢',
  },
];

const isGameLive = (gameId, gameSettings) => {
  if (!gameSettings?.gamesEnabled) return true;
  const map = {
    'lucky-triple': gameSettings.gamesEnabled.luckyTriple,
    spin: gameSettings.gamesEnabled.spin,
    slots: gameSettings.gamesEnabled.slots,
    roulette: gameSettings.gamesEnabled.roulette,
  };
  return map[gameId] !== false;
};

export const CasinoLobby = ({ onSelectGame, gameSettings }) => {
  const difficulty = gameSettings?.difficulty || 'medium';
  const difficultyEmoji = { easy: '😊', medium: '🎲', hard: '🔥' }[difficulty] || '🎲';

  return (
    <motion.div
      className="casino-lobby casino-lobby--fun"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35 }}
    >
      <div className="lobby-stickers" aria-hidden="true">
        {FLOATING_STICKERS.map((sticker, i) => (
          <motion.span
            key={i}
            className="lobby-sticker"
            style={{ left: `${(i * 11 + 3) % 95}%`, top: `${(i * 17 + 5) % 80}%` }}
            animate={{ y: [0, -12, 0], rotate: [0, 10, -10, 0] }}
            transition={{ duration: 3 + i * 0.4, repeat: Infinity, delay: i * 0.3 }}
          >
            {sticker}
          </motion.span>
        ))}
      </div>

      <header className="casino-lobby__hero">
        <motion.div
          className="casino-lobby__jackpot-banner"
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          💰 JACKPOT ZONE 💰
        </motion.div>
        <motion.p className="casino-lobby__eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          🎉 Welcome to the fun zone 🎉
        </motion.p>
        <h1 className="casino-lobby__title">
          🎰 Pick Your Game 🎰
        </h1>
        <p className="casino-lobby__subtitle">
          🃏 4 epic games · 💳 Payloqa wallet · 🍀 Good luck!
        </p>
        {gameSettings && (
          <div className="casino-lobby__meta">
            <span>💵 Min GHS {gameSettings.minBet}</span>
            <span className="casino-lobby__dot" />
            <span>💎 Max GHS {gameSettings.maxBet}</span>
            <span className="casino-lobby__dot" />
            <span>{difficultyEmoji} {difficulty} mode</span>
          </div>
        )}
      </header>

      <div className="casino-lobby__grid">
        {GAMES.map((game, index) => {
          const live = isGameLive(game.id, gameSettings);
          return (
            <motion.article
              key={game.id}
              className={`game-card game-card--fun game-card--${game.accent} ${live ? '' : 'game-card--disabled'}`}
              initial={{ opacity: 0, y: 24, rotate: -2 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ delay: 0.08 * index, duration: 0.4 }}
              whileHover={live ? { y: -8, scale: 1.03, rotate: 1 } : {}}
              whileTap={live ? { scale: 0.97 } : {}}
              onClick={() => live && onSelectGame(game.id)}
              role={live ? 'button' : 'presentation'}
              tabIndex={live ? 0 : -1}
              onKeyDown={(e) => {
                if (live && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onSelectGame(game.id);
                }
              }}
            >
              <div className="game-card__glow" />
              <span className="game-card__sticker">{game.sticker}</span>
              <span className="game-card__tag">{game.tag}</span>
              <div className="game-card__emoji">{game.emoji}</div>
              <div className="game-card__icon">{game.icon}</div>
              <h3 className="game-card__title">{game.title}</h3>
              <p className="game-card__desc">{game.description}</p>
              <button
                type="button"
                className="game-card__cta"
                disabled={!live}
                onClick={(e) => {
                  e.stopPropagation();
                  if (live) onSelectGame(game.id);
                }}
              >
                {live ? `🎮 Play ${game.emoji}` : '🔒 Disabled'}
              </button>
            </motion.article>
          );
        })}
      </div>

      <motion.div
        className="casino-lobby__trust"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="trust-pill">🔒 Secure Payloqa</div>
        <div className="trust-pill">📱 MTN / Vodafone / AirtelTigo</div>
        <div className="trust-pill">💸 24/7 Withdrawals</div>
        <div className="trust-pill">🎁 Refer & Earn</div>
      </motion.div>
    </motion.div>
  );
};
