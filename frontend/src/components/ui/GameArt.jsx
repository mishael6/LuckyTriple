export const GameArt = ({ src, alt, className = '', size = 'hero', spinning = false, visual = 'default' }) => {
  if (!src) return null;

  const sizeClass = `game-art--${size}`;
  const visualClass = visual !== 'default' ? `game-art--${visual}` : '';

  return (
    <div className={`game-art ${sizeClass} ${visualClass} ${spinning ? 'game-art--spinning' : ''} ${className}`}>
      <img src={src} alt={alt} className="game-art__img" draggable={false} />
    </div>
  );
};
