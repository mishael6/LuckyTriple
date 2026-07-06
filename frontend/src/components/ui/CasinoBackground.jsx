import { motion } from 'framer-motion';

export const CasinoBackground = () => (
  <div className="casino-bg" aria-hidden="true">
    <div className="casino-bg__gradient" />
    {Array.from({ length: 24 }).map((_, i) => (
      <motion.span
        key={i}
        className="casino-bg__particle"
        style={{
          left: `${(i * 17 + 5) % 100}%`,
          top: `${(i * 23 + 10) % 100}%`,
          width: `${4 + (i % 5)}px`,
          height: `${4 + (i % 5)}px`,
        }}
        animate={{
          y: [0, -30 - (i % 20), 0],
          opacity: [0.15, 0.5, 0.15],
        }}
        transition={{
          duration: 4 + (i % 4),
          repeat: Infinity,
          delay: i * 0.2,
          ease: 'easeInOut',
        }}
      />
    ))}
  </div>
);
