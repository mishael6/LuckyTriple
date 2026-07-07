import luckynumber from './luckynumber.png';
import spinthebottle from './spinthebottle.png';
import goldenroulette from './goldenroulette.png';
import slots from './slots.png';
import coin from './coin.png';
import dice from './dice.png';

export const GAME_IMAGES = {
  'lucky-triple': luckynumber,
  spin: spinthebottle,
  roulette: goldenroulette,
  slots,
  coin,
  dice,
};

export const getGameImage = (gameId) => GAME_IMAGES[gameId] || null;
