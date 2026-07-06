import { motion } from 'framer-motion';

const GAMES = [
  {
    id: 'lucky-triple',
    title: 'Lucky Triple',
    description: 'Pick 3 lucky digits. Match 2 or 3 to win up to 50x your bet.',
    tag: 'Popular',
    accent: 'gold',
    live: true,
    icon: '777',
  },
  {
    id: 'spin',
    title: 'Spin the Bottle',
    description: 'Predict up or down. Choose your multiplier and test your luck.',
    tag: 'Fast play',
    accent: 'emerald',
    live: true,
    icon: 'SPIN',
  },
  {
    id: 'slots',
    title: 'Lucky Slots',
    description: 'Classic reels with jackpot bursts and bonus free spins.',
    tag: 'Coming soon',
    accent: 'ruby',
    live: false,
    icon: 'SLOT',
  },
  {
    id: 'roulette',
    title: 'Golden Roulette',
    description: 'European wheel with smooth animations and live odds.',
    tag: 'Coming soon',
    accent: 'violet',
    live: false,
    icon: 'WHEEL',
  },
];

export const CasinoLobby = ({ onSelectGame, gameSettings }) => {
  return (
    <motion.div
      className="casino-lobby"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35 }}
    >
      <header className="casino-lobby__hero">
        <motion.p
          className="casino-lobby__eyebrow"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          Premium casino experience
        </motion.p>
        <h1 className="casino-lobby__title">Choose Your Game</h1>
        <p className="casino-lobby__subtitle">
          Play instantly with your wallet balance. Deposits powered by Payloqa mobile money.
        </p>
        {gameSettings && (
          <div className="casino-lobby__meta">
            <span>Min bet GHS {gameSettings.minBet}</span>
            <span className="casino-lobby__dot" />
            <span>Max bet GHS {gameSettings.maxBet}</span>
          </div>
        )}
      </header>

      <div className="casino-lobby__grid">
        {GAMES.map((game, index) => (
          <motion.article
            key={game.id}
            className={`game-card game-card--${game.accent} ${game.live ? '' : 'game-card--disabled'}`}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * index, duration: 0.4 }}
            whileHover={game.live ? { y: -6, scale: 1.02 } : {}}
            whileTap={game.live ? { scale: 0.98 } : {}}
            onClick={() => game.live && onSelectGame(game.id)}
            role={game.live ? 'button' : 'presentation'}
            tabIndex={game.live ? 0 : -1}
            onKeyDown={(e) => {
              if (game.live && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onSelectGame(game.id);
              }
            }}
          >
            <div className="game-card__glow" />
            <span className="game-card__tag">{game.tag}</span>
            <div className="game-card__icon">{game.icon}</div>
            <h3 className="game-card__title">{game.title}</h3>
            <p className="game-card__desc">{game.description}</p>
            <button
              type="button"
              className="game-card__cta"
              disabled={!game.live}
              onClick={(e) => {
                e.stopPropagation();
                if (game.live) onSelectGame(game.id);
              }}
            >
              {game.live ? 'Play now' : 'Coming soon'}
            </button>
          </motion.article>
        ))}
      </div>

      <motion.div
        className="casino-lobby__trust"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="trust-pill">Secure Payloqa payments</div>
        <div className="trust-pill">MTN / Vodafone / AirtelTigo</div>
        <div className="trust-pill">24/7 withdrawals</div>
      </motion.div>
    </motion.div>
  );
};
