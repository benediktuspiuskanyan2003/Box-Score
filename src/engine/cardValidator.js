/**
 * Card Validator - Validasi SON, BOX, dan sambung kartu
 * 
 * Aturan:
 * - SON: 3-13 kartu, simbol sama, berurutan
 * - A contextual: bisa jadi awal (1) ATAU akhir (14), BUKAN keduanya
 * - Joker boleh isi celah
 * - BOX: 3+ kartu angka sama
 */

import { getCardValue } from './deckManager.js';

/**
 * Check apakah kartu bisa membuat SON yang valid
 * @param {Array} cards - Kartu yang dipilih
 * @returns {Object} { valid: boolean, reason: string }
 */
export function isValidSon(cards) {
  if (!Array.isArray(cards) || cards.length < 3 || cards.length > 13) {
    return { valid: false, reason: `Son harus 3-13 kartu, dapat ${cards.length}` };
  }

  // Pisahkan Joker dan non-Joker
  const jokers = cards.filter(c => c.isJoker);
  const nonJokers = cards.filter(c => !c.isJoker);

  if (nonJokers.length === 0) {
    return { valid: false, reason: 'Son harus ada minimal 1 kartu non-Joker' };
  }

  // Cek semua non-Joker simbol sama
  const firstSuit = nonJokers[0].suit;
  if (!nonJokers.every(c => c.suit === firstSuit)) {
    return { valid: false, reason: 'Semua kartu di Son harus simbol sama' };
  }

  // Cek urutan dengan Joker
  const isValid = isConsecutiveWithJokers(nonJokers, jokers.length);
  if (!isValid.valid) {
    return isValid;
  }

  return { valid: true };
}

/**
 * Check apakah kartu berurutan dengan support Joker
 * Khusus: A bisa jadi awal (1) ATAU akhir (14), tapi BUKAN keduanya
 */
function isConsecutiveWithJokers(nonJokers, jokerCount) {
  if (nonJokers.length === 0) {
    return { valid: false, reason: 'Tidak ada kartu non-Joker' };
  }

  // Sort by value
  const sorted = [...nonJokers].sort((a, b) => getCardValue(a.rank) - getCardValue(b.rank));
  const values = sorted.map(c => getCardValue(c.rank));

  // Cek 2 skenario untuk A
  const scenarios = [];

  // Scenario 1: A sebagai 1 (awal: A-2-3-...)
  scenarios.push(checkConsecutive(values, jokerCount, 'awal'));

  // Scenario 2: A sebagai 14 (akhir: ...-Q-K-A)
  // Special: hanya valid jika max value >= 11 (J, Q, K, atau A)
  if (values.includes(1) && Math.max(...values) >= 11) {
    const valuesWithAas14 = values.map(v => v === 1 ? 14 : v);
    scenarios.push(checkConsecutive(valuesWithAas14, jokerCount, 'akhir'));
  }

  // Cek apakah ada scenario yang valid
  for (const scenario of scenarios) {
    if (scenario.valid) {
      return { valid: true, aPosition: scenario.aPosition };
    }
  }

  return {
    valid: false,
    reason: `Kartu tidak berurutan. Values: ${values.join(',')}. Joker: ${jokerCount}`
  };
}

/**
 * Helper: cek apakah values berurutan dengan joker
 */
function checkConsecutive(values, jokerCount, aPosition) {
  // Check duplikat DULU - tidak boleh ada kartu rank yang sama
  const unique = [...new Set(values)];
  if (unique.length !== values.length) {
    return { valid: false, aPosition, reason: 'Tidak boleh ada kartu rank yang sama dalam SON' };
  }

  // Sort values
  const sorted = [...unique].sort((a, b) => a - b);

  if (sorted.length === 1) {
    return { valid: false, aPosition };
  }

  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const expectedLength = max - min + 1;
  const gaps = expectedLength - sorted.length;

  // Gaps harus bisa diisi Joker
  if (gaps <= jokerCount && expectedLength <= 13) {
    return { valid: true, aPosition };
  }

  return { valid: false, aPosition };
}

/**
 * Hitung rank-rank (numeric values) yang sudah diisi Joker dalam sebuah Son.
 * 
 * Cara kerja:
 * - Tentukan range sequence dari nilai minimum hingga maksimum non-Joker
 * - Slot dalam range yang tidak diisi non-Joker = diisi Joker
 * 
 * Contoh: Son [10, J, Joker, K] → non-Joker values = [10,11,13]
 *   range = 10-13, slot terisi = {10,11,13}, maka Joker occupies {12} (Q)
 * 
 * @param {Array} sonCards - Kartu di Son saat ini
 * @returns {Set<number>} Set of numeric values yang di-occupy Joker
 */
function getJokerOccupiedValues(sonCards) {
  const nonJokers = sonCards.filter(c => !c.isJoker);
  const jokers = sonCards.filter(c => c.isJoker);

  if (jokers.length === 0) return new Set();
  if (nonJokers.length === 0) return new Set();

  // Dapatkan nilai numerik semua non-Joker, handle A sebagai 14 jika ada K
  let values = nonJokers.map(c => getCardValue(c.rank));

  // Handle A: jika ada A (value=1) dan ada K (value=13) atau Q (value=12),
  // treat A sebagai 14 untuk hitung range yang benar
  const hasAce = values.includes(1);
  const hasHighCard = values.some(v => v >= 11); // J, Q, K
  if (hasAce && hasHighCard) {
    values = values.map(v => v === 1 ? 14 : v);
  }

  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  // Kumpulkan semua slot dalam range
  const filledSlots = new Set(values);
  const jokerOccupied = new Set();

  for (let v = min; v <= max; v++) {
    if (!filledSlots.has(v)) {
      jokerOccupied.add(v);
    }
  }

  return jokerOccupied;
}

/**
 * Check apakah pemain bisa main di awal ronde (Son pertama)
 * - WAJIB keluarkan Son (3+ kartu)
 * - ATAU BOX 5+ kartu jika tidak bisa Son
 * - ATAU -50 & keluar
 */
export function checkFirstSon(playerCards) {
  const sonPossible = playerCards.some(combo => isValidSon(combo).valid);
  const boxPossible = playerCards.some(combo => 
    isValidBox(combo, true).valid && combo.length >= 5
  );

  return {
    canSon: sonPossible,
    canBox: boxPossible,
    canPlay: sonPossible || boxPossible
  };
}

/**
 * Check apakah pemain punya Cate Tangan (8 kartu Son exact di awal)
 * @param {Array} playerCards - Semua kartu pemain
 * @returns {boolean}
 */
export function checkCateTangan(playerCards) {
  const bySuit = { '♠': [], '♥': [], '♣': [], '♦': [] };
  playerCards.forEach(c => {
    if (!c.isJoker) {
      bySuit[c.suit].push(c);
    }
  });

  for (const suit in bySuit) {
    const cards = bySuit[suit];
    
    for (let startIdx = 0; startIdx <= cards.length - 8; startIdx++) {
      const subset = cards.slice(startIdx, startIdx + 8);
      if (isValidSon(subset).valid) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check apakah kartu bisa membuat BOX yang valid
 * @param {Array} cards - Kartu yang dipilih
 * @param {boolean} isSunFirstPhase - Apakah masih di fase Son pertama
 * @returns {Object} { valid: boolean, reason: string }
 */
export function isValidBox(cards, isSonFirstPhase = false) {
  if (!Array.isArray(cards) || cards.length < 3) {
    return { valid: false, reason: `Box harus minimal 3 kartu, dapat ${cards.length}` };
  }

  // Pisahkan Joker dan non-Joker
  const jokers = cards.filter(c => c.isJoker);
  const nonJokers = cards.filter(c => !c.isJoker);

  if (nonJokers.length === 0) {
    return { valid: false, reason: 'Box harus ada minimal 1 kartu non-Joker' };
  }

  const firstRank = nonJokers[0].rank;
  if (!nonJokers.every(c => c.rank === firstRank)) {
    return { valid: false, reason: 'Semua kartu di Box harus angka/rank sama' };
  }

  // Max 8 kartu per rank (2 set × 4 suit + joker sebagai bonus)
  if (cards.length > 8) {
    return { valid: false, reason: `Box tidak bisa lebih dari 8 kartu (max 8 ${firstRank})` };
  }

  return { valid: true };
}

/**
 * Check apakah kartu bisa disambung ke Son yang sudah ada
 * @param {Array} sonCards - Kartu di Son saat ini
 * @param {Object} playCard - Kartu yang akan di-play
 * @param {String} position - 'left', 'right', atau 'fill'
 * @returns {Object} { valid: boolean, reason: string }
 */
export function canExtendSon(sonCards, playCard, position) {
  if (!isValidSon(sonCards).valid) {
    return { valid: false, reason: 'Son saat ini tidak valid' };
  }

  if (sonCards.length >= 13) {
    return { valid: false, reason: 'Son sudah penuh (13 kartu max)' };
  }

  // ✅ FIX: Cek apakah rank kartu ini sudah diisi Joker di Son
  if (!playCard.isJoker) {
    const jokerOccupied = getJokerOccupiedValues(sonCards);
    const cardValue = getCardValue(playCard.rank);
    if (jokerOccupied.has(cardValue)) {
      return { valid: false, reason: `Slot rank ${playCard.rank} sudah diisi Joker` };
    }
  }

  const newCards = [...sonCards, playCard];

  // Cek apakah dengan kartu baru, Son tetap valid
  if (!isValidSon(newCards).valid) {
    return { valid: false, reason: 'Kartu tidak bisa disambung ke Son ini' };
  }

  return { valid: true };
}

/**
 * Check apakah 1-2 kartu bisa disambung ke Son (strict validation)
 * Rules:
 * - 1 kartu: harus langsung sebelum/sesudah Son (tidak boleh skip), tidak boleh Joker alone
 * - 2 kartu: boleh ada Joker sebagai pengganti nilai, kartu harus berurutan
 * @param {Array} sonCards - Kartu di Son saat ini
 * @param {Array} playCards - Array of 1-2 kartu yang akan di-play
 * @param {String} position - 'left' atau 'right'
 * @returns {Object} { valid: boolean, reason: string }
 */
export function canExtendSonMultiple(sonCards, playCards, position) {
  if (!isValidSon(sonCards).valid) {
    return { valid: false, reason: 'Son saat ini tidak valid' };
  }

  if (sonCards.length + playCards.length > 13) {
    return { valid: false, reason: 'Exceed Son max size (13)' };
  }

  const playCardsCount = playCards.length;
  if (playCardsCount < 1 || playCardsCount > 2) {
    return { valid: false, reason: 'Extend hanya boleh 1-2 kartu' };
  }

  // Check if all play cards same suit as Son
  const sonSuit = sonCards.find(c => !c.isJoker)?.suit;
  const playSuit = playCards.find(c => !c.isJoker)?.suit;
  
  if (sonSuit && playSuit && sonSuit !== playSuit) {
    return { valid: false, reason: `Simbol harus sama dengan Son (${sonSuit})` };
  }

  // ✅ FIX: Hitung slot yang sudah diisi Joker di Son ini
  const jokerOccupied = getJokerOccupiedValues(sonCards);

  // Rule 1: Single card extend
  if (playCardsCount === 1) {
    const card = playCards[0];
    
    // Tidak boleh Joker sendiri
    if (card.isJoker) {
      return { valid: false, reason: 'Joker tidak boleh dikeluarkan sendiri' };
    }

    // ✅ FIX: Cek konflik dengan slot Joker
    const cardValue = getCardValue(card.rank);
    if (jokerOccupied.has(cardValue)) {
      return { valid: false, reason: `Slot rank ${card.rank} sudah diisi Joker di Son ini` };
    }

    const sonFirst = sonCards[0];
    const sonLast = sonCards[sonCards.length - 1];
    let cardVal = getCardValue(card.rank);
    
    if (position === 'left') {
      // A special case
      if (card.rank === 'A') {
        const firstValue = getCardValue(sonFirst.rank);
        if (firstValue === 2) {
          cardVal = 1;
        } else {
          return { valid: false, reason: `A tidak bisa disambung di kiri` };
        }
      }
      const testSon = [card, ...sonCards];
      if (!isValidSon(testSon).valid) {
        return { valid: false, reason: `Kartu tidak bisa disambung di kiri` };
      }
    } else if (position === 'right') {
      // A special case
      if (card.rank === 'A') {
        const lastValue = getCardValue(sonLast.rank);
        if (lastValue === 13) {
          cardVal = 14;
        } else {
          return { valid: false, reason: `A tidak bisa disambung di kanan` };
        }
      }
      const testSon = [...sonCards, card];
      if (!isValidSon(testSon).valid) {
        return { valid: false, reason: `Kartu tidak bisa disambung di kanan` };
      }
    }
  }

  // Rule 2: Two card extend
  if (playCardsCount === 2) {
    const jokerCount = playCards.filter(c => c.isJoker).length;
    if (jokerCount === 2) {
      return { valid: false, reason: 'Tidak boleh semua kartu Joker' };
    }

    const nonJokers = playCards.filter(c => !c.isJoker);
    const jokers = playCards.filter(c => c.isJoker);
    
    if (nonJokers.length === 0) {
      return { valid: false, reason: 'Harus ada minimal 1 kartu non-Joker' };
    }

    // ✅ FIX: Cek konflik semua non-Joker play cards dengan slot Joker di Son
    for (const card of nonJokers) {
      const cardValue = getCardValue(card.rank);
      if (jokerOccupied.has(cardValue)) {
        return { valid: false, reason: `Slot rank ${card.rank} sudah diisi Joker di Son ini` };
      }
    }

    // Check apakah play cards berurutan
    if (nonJokers.length === 2) {
      const val1 = getCardValue(nonJokers[0].rank);
      const val2 = getCardValue(nonJokers[1].rank);
      const sorted = [val1, val2].sort((a, b) => a - b);
      
      if (sorted[1] - sorted[0] !== 1) {
        return { valid: false, reason: 'Dua kartu harus berurutan' };
      }
    }

    // Check apakah bisa disambung ke Son
    const sonFirst = sonCards[0];
    const sonLast = sonCards[sonCards.length - 1];
    const firstPlayValue = getCardValue(nonJokers[0].rank);
    const lastPlayValue = nonJokers.length === 2 
      ? getCardValue(nonJokers[1].rank)
      : firstPlayValue;
    
    if (position === 'left') {
      const firstSunValue = getCardValue(sonFirst.rank);
      const maxPlay = Math.max(firstPlayValue, lastPlayValue);
      if (maxPlay !== firstSunValue - 1 && maxPlay !== firstSunValue - 2) {
        return { valid: false, reason: `Tidak bisa extend kiri dengan nilai ini` };
      }
    } else if (position === 'right') {
      const lastSunValue = getCardValue(sonLast.rank);
      const minPlay = Math.min(firstPlayValue, lastPlayValue);
      if (minPlay !== lastSunValue + 1 && minPlay !== lastSunValue + 2) {
        return { valid: false, reason: `Tidak bisa extend kanan dengan nilai ini` };
      }
    }
  }

  // Final check: Son harus tetap valid setelah extend
  const newSunCards = position === 'left' 
    ? [...playCards, ...sonCards]
    : [...sonCards, ...playCards];
  
  if (!isValidSon(newSunCards).valid) {
    return { valid: false, reason: 'Son tidak valid setelah extend' };
  }

  return { valid: true };
}

/**
 * Get all valid moves untuk pemain saat gilirannya
 * @param {Array} playerCards - Kartu di tangan pemain
 * @param {Array} sunList - Daftar Son di meja
 * @param {Array} boxList - Daftar Box di meja
 * @returns {Array} Array of valid moves
 */
export function getValidMoves(playerCards, sunList = [], boxList = []) {
  const validMoves = [];

  // Check move: mainkan kartu ke Son yang ada
  for (let sonIdx = 0; sonIdx < sunList.length; sonIdx++) {
    const sun = sunList[sonIdx];
    
    for (let cardIdx = 0; cardIdx < playerCards.length; cardIdx++) {
      const card = playerCards[cardIdx];
      
      if (canExtendSon(son.cards, card, 'left').valid) {
        validMoves.push({
          type: 'extend_sun',
          sonIdx,
          cardIdx,
          position: 'left'
        });
      }
      if (canExtendSon(son.cards, card, 'right').valid) {
        validMoves.push({
          type: 'extend_sun',
          sonIdx,
          cardIdx,
          position: 'right'
        });
      }
    }
  }

  // Check move: buat Son baru
  for (let i = 0; i < playerCards.length; i++) {
    for (let j = i + 1; j < playerCards.length; j++) {
      for (let k = j + 1; k < playerCards.length; k++) {
        const testCards = [playerCards[i], playerCards[j], playerCards[k]];
        if (isValidSon(testCards).valid) {
          validMoves.push({
            type: 'new_sun',
            cardIndices: [i, j, k]
          });
        }
      }
    }
  }

  // Check move: buat BOX baru
  for (let i = 0; i < playerCards.length; i++) {
    for (let j = i + 1; j < playerCards.length; j++) {
      for (let k = j + 1; k < playerCards.length; k++) {
        const testCards = [playerCards[i], playerCards[j], playerCards[k]];
        if (isValidBox(testCards).valid) {
          validMoves.push({
            type: 'new_box',
            cardIndices: [i, j, k]
          });
        }
      }
    }
  }

  return validMoves;
}
