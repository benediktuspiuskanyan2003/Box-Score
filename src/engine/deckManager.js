/**
 * Deck Manager - Handle kartu: shuffle, deal, sisa
 * 108 kartu = 2 set remi (52×2) + 4 Joker
 */

export const CARD_SUITS = ['♠', '♥', '♣', '♦'];
export const CARD_RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const JOKER = 'JOKER';

/**
 * Create fresh deck dengan 108 kartu
 */
export function createDeck() {
  const deck = [];
  
  // 2 set remi (52 kartu × 2)
  for (let set = 0; set < 2; set++) {
    for (const suit of CARD_SUITS) {
      for (const rank of CARD_RANKS) {
        deck.push({
          id: `${suit}-${rank}-${set}`,
          suit,
          rank,
          label: rank,
          value: getCardValue(rank),
          isJoker: false
        });
      }
    }
  }
  
  // 4 Joker
  for (let i = 0; i < 4; i++) {
    deck.push({
      id: `JOKER-${i}`,
      suit: null,
      rank: JOKER,
      label: JOKER,
      value: 100,
      isJoker: true
    });
  }
  
  return deck;
}

/**
 * Shuffle deck dengan Fisher-Yates algorithm
 */
export function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Deal kartu ke setiap pemain
 * @param {Array} deck - Shuffled deck
 * @param {number} playerCount - Jumlah pemain (4 atau 5)
 * @returns {Object} { playerCards: {playerId: []}, remaining: [] }
 */
export function dealCards(deck, playerCount) {
  const cardsPerPlayer = playerCount === 4 ? 24 : 21;
  const cardsPerRound = 3; // 3 kartu per putaran
  
  const playerCards = Array(playerCount).fill(null).map(() => []);
  let deckIndex = 0;
  
  // Deal kartu dengan round-robin: setiap pemain dapat 3 kartu per putaran
  for (let i = 0; i < cardsPerPlayer * playerCount; i++) {
    const playerIdx = i % playerCount;
    if (deckIndex < deck.length) {
      playerCards[playerIdx].push(deck[deckIndex]);
      deckIndex++;
    }
  }
  
  const remaining = deck.slice(deckIndex);
  
  return { playerCards, remaining };
}

/**
 * Get numeric value untuk kartu (untuk sorting)
 * A=1, 2-10=face, J=11, Q=12, K=13
 */
export function getCardValue(rank) {
  const values = {
    'A': 1, '2': 2, '3': 3, '4': 4, '5': 5,
    '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 11, 'Q': 12, 'K': 13
  };
  return values[rank] || 0;
}

/**
 * Get minus value untuk kartu sisa (scoring)
 */
export function getMinusValue(rank) {
  const values = {
    'JOKER': 100,
    'A': 15,
    'K': 10, 'Q': 10, 'J': 10, '10': 10,
    '9': 9, '8': 8, '7': 7, '6': 6,
    '5': 5, '4': 4, '3': 3, '2': 2
  };
  return values[rank] || 0;
}

