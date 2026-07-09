import { useEffect, useState } from 'react';

const DICE_DOTS = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 28], [72, 28], [28, 50], [72, 50], [28, 72], [72, 72]],
};

const DieFace = ({ value }) => (
  <div className="die-face">
    <div className="die-face__dots">
      {(DICE_DOTS[value] || DICE_DOTS[1]).map(([x, y], i) => (
        <span key={i} className="die-dot" style={{ left: `${x}%`, top: `${y}%` }} />
      ))}
    </div>
  </div>
);

export const BottleVisual = ({ spinning, outcome }) => {
  const landDeg = outcome === 'bottom' ? 180 : 0;
  const landedStyle = !spinning && outcome
    ? { transform: `rotate(${1440 + landDeg}deg)` }
    : undefined;

  return (
    <div className={`game-visual bottle-visual ${spinning ? 'bottle-visual--spinning' : ''} ${outcome && !spinning ? 'bottle-visual--landed' : ''}`}>
      <div className="bottle-visual__spinner" style={landedStyle}>
        <div className="bottle-visual__cap" />
        <div className="bottle-visual__neck" />
        <div className="bottle-visual__body">
          <div className="bottle-visual__label">🍾</div>
        </div>
      </div>
      <div className="bottle-visual__pointer">▲</div>
      <div className="bottle-visual__floor" />
    </div>
  );
};

const WHEEL_FULL_ROTATION = 6 * 360;
// Align the center of each half (not the seam) with the top pointer
const ROULETTE_LAND_OFFSET = { red: 270, black: 90 };

export const RouletteWheelVisual = ({ spinning, outcome, idleSpin = false }) => {
  const [rotation, setRotation] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (spinning && outcome) {
      setIsAnimating(false);
      setRotation(0);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
          setRotation(WHEEL_FULL_ROTATION + ROULETTE_LAND_OFFSET[outcome]);
        });
      });
      return () => cancelAnimationFrame(frame);
    }

    if (!spinning && outcome) {
      setIsAnimating(false);
      setRotation(WHEEL_FULL_ROTATION + ROULETTE_LAND_OFFSET[outcome]);
      return;
    }

    if (!spinning && !outcome) {
      setIsAnimating(false);
      setRotation(0);
    }
  }, [spinning, outcome]);

  const useJsRotation = Boolean(outcome);
  const showIdleAnimation = idleSpin && !spinning && !outcome;
  const wheelStyle = useJsRotation
    ? {
        transform: `rotate(${rotation}deg)`,
        transition: isAnimating ? 'transform 2.8s cubic-bezier(0.12, 0.8, 0.2, 1)' : 'none',
        animation: 'none',
      }
    : undefined;

  return (
    <div className={`game-visual roulette-visual ${showIdleAnimation ? 'roulette-visual--idle' : ''} ${spinning ? 'roulette-visual--spinning' : ''} ${outcome && !spinning ? 'roulette-visual--landed' : ''}`}>
      <div className="roulette-visual__pointer" />
      <div className="roulette-visual__wheel-wrap">
        <div className="roulette-visual__wheel" style={wheelStyle}>
          <div className="roulette-visual__label roulette-visual__label--red">RED</div>
          <div className="roulette-visual__label roulette-visual__label--black">BLACK</div>
          <div className="roulette-visual__hub">🎡</div>
        </div>
      </div>
    </div>
  );
};

export const CoinVisual = ({ spinning, outcome }) => {
  const isTails = outcome === 'tails';
  const landedStyle = !spinning && outcome
    ? { transform: `rotateY(${isTails ? 1980 : 1800}deg)` }
    : undefined;

  return (
    <div className={`game-visual coin-visual ${spinning ? 'coin-visual--flipping' : ''} ${outcome && !spinning ? (isTails ? 'coin-visual--tails' : 'coin-visual--heads') : ''}`}>
      <div className="coin-visual__coin" style={landedStyle}>
        <div className="coin-visual__face coin-visual__face--heads">
          <span className="coin-visual__emblem">H</span>
          <span className="coin-visual__text">HEADS</span>
        </div>
        <div className="coin-visual__face coin-visual__face--tails">
          <span className="coin-visual__emblem">T</span>
          <span className="coin-visual__text">TAILS</span>
        </div>
      </div>
      <div className="coin-visual__shadow" />
    </div>
  );
};

export const DiceDuelVisual = ({ spinning, diceRolls = [1, 1] }) => (
  <div className={`game-visual dice-visual ${spinning ? 'dice-visual--rolling' : ''}`}>
    <div className="dice-visual__pair">
      <div className="die die--left">
        <DieFace value={diceRolls[0] || 1} />
      </div>
      <div className="die die--right">
        <DieFace value={diceRolls[1] || 1} />
      </div>
    </div>
    {!spinning && diceRolls.length === 2 && (
      <div className="dice-visual__sum">Total: {diceRolls[0] + diceRolls[1]}</div>
    )}
  </div>
);

const VISUAL_MAP = {
  bottle: BottleVisual,
  wheel: RouletteWheelVisual,
  coin: CoinVisual,
  dice: DiceDuelVisual,
};

export const GameVisual = ({ type, ...props }) => {
  const Component = VISUAL_MAP[type];
  if (!Component) return null;
  return <Component {...props} />;
};
