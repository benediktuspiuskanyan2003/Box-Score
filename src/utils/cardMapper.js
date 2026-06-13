/**
 * cardMapper.js
 * Mapping dari format kartu game (rank, suit) ke nama ID kartu di svg-cards.svg
 *
 * SVG Cards repo: https://github.com/htdebeer/SVG-cards
 * Format nama: {suit}_{value}
 * Contoh: heart_1, spade_king, club_jack, diamond_10, joker_red
 */

// URL file SVG sprite dari GitHub (raw)
// cardMapper.js
export const SVG_CARDS_URL = '/svg-cards.svg';

// Dimensi natural kartu dari repo
export const CARD_WIDTH = 169.075;
export const CARD_HEIGHT = 244.64;
export const CARD_ASPECT = CARD_HEIGHT / CARD_WIDTH; // ~1.447

/**
 * Map suit dari format game (♠ ♥ ♣ ♦) ke nama SVG
 */
const SUIT_MAP = {
  '♠': 'spade',
  '♥': 'heart',
  '♣': 'club',
  '♦': 'diamond',
};

/**
 * Map rank dari format game ke nilai SVG
 */
const RANK_MAP = {
  'A':  '1',
  '2':  '2',
  '3':  '3',
  '4':  '4',
  '5':  '5',
  '6':  '6',
  '7':  '7',
  '8':  '8',
  '9':  '9',
  '10': '10',
  'J':  'jack',
  'Q':  'queen',
  'K':  'king',
};

/**
 * Dapatkan ID kartu SVG dari objek kartu game
 * @param {Object} card - { rank, suit, isJoker }
 * @param {number} jokerIndex - 0 atau 1, untuk ganti warna joker (0=red, 1=black)
 * @returns {string} ID untuk dipakai di <use href="svg-cards.svg#{id}" />
 */
export function getCardSvgId(card, jokerIndex = 0) {
  if (card.isJoker) {
    // Joker bergantian merah/hitam berdasarkan index
    return jokerIndex % 2 === 0 ? 'joker_red' : 'joker_black';
  }

  const suit = SUIT_MAP[card.suit];
  const value = RANK_MAP[card.rank];

  if (!suit || !value) {
    console.warn(`Unknown card: suit=${card.suit}, rank=${card.rank}`);
    return 'alternate-back';
  }

  return `${suit}_${value}`;
}

/**
 * Dapatkan URL lengkap untuk kartu tertentu
 */
export function getCardSvgUrl(card, jokerIndex = 0) {
  const id = getCardSvgId(card, jokerIndex);
  return `${SVG_CARDS_URL}#${id}`;
}

/**
 * URL kartu belakang (face down)
 */
export const CARD_BACK_URL = `${SVG_CARDS_URL}#alternate-back`;
