export const CARD_VALUES = {
  'A': 15,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  'J': 10,
  'Q': 10,
  'K': 10,
  'JOKER': 100
};

export const CARD_NAMES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'JOKER'];

export const MINUS_LIMITS = [-300, -400, -500];

export const MAX_CARDS_PER_TYPE = 8; // 2 sets (4 per set) + 4 jokers = 8

export const SUN_FAILED_PENALTY = -50;
export const CATE_BONUS = 50;
export const JOKER_BONUS = 100; // per joker when CATE
export const JOKER_PENALTY = 100; // per joker when not CATE
