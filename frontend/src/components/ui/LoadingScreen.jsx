import { motion } from 'framer-motion';

export const LoadingScreen = ({ label = 'Loading' }) => (
  <div className="loading-screen">
    <div className="loading-screen__bg" />
    <motion.div
      className="loading-screen__content"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="loading-screen__logo">LT</div>
      <h2 className="loading-screen__title">Lucky Triple</h2>
      <div className="loading-screen__bar">
        <motion.div
          className="loading-screen__bar-fill"
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
      <p className="loading-screen__label">{label}</p>
    </motion.div>
  </div>
);
