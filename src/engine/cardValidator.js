/**
 * Card Validator - Validasi SUN, BOX, dan sambung kartu
 * 
 * Aturan:
 * - SUN: 3-13 kartu, simbol sama, berurutan
 * - A contextual: bisa jadi awal (1) ATAU akhir (14), BUKAN keduanya
 * - Joker boleh isi celah
 * - BOX: 3+ kartu angka sama
 */

import { getCardValue } from './deckManager.js';

/**
 * Check apakah kartu bisa membuat SUN yang valid
 * @param {Array} cards - Kartu yang dipilih
 * @returns {Object} { valid: boolean, reason: string }
 */
export function isValidSun(cards) {
  if (!Array.isArray(cards) || cards.length < 3 || cards.length > 13) {
    return { valid: false, reason: `Sun harus 3-13 kartu, dapat ${cards.length}` };
  }

  // Pisahkan Joker dan non-Joker
  const jokers = cards.filter(c => c.isJoker);
  const nonJokers = cards.filter(c => !c.isJoker);

  if (nonJokers.length === 0) {
    return { valid: false, reason: 'Sun harus ada minimal 1 kartu non-Joker' };
  }

  // Cek semua non-Joker simbol sama
  const firstSuit = nonJokers[0].suit;
  if (!nonJokers.every(c => c.suit === firstSuit)) {
    return { valid: false, reason: 'Semua kartu di Sun harus simbol sama' };
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
    return { valid: false, aPosition, reason: 'Tidak boleh ada kartu rank yang sama dalam SUN' };
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
 * Check apakah kartu bisa membuat BOX yang valid
 * @param {Array} cards - Kartu yang dipilih
 * @param {boolean} isSunFirstPhase - Apakah masih di fase Sun pertama
 * @returns {Object} { valid: boolean, reason: string }
 */
export function isValidBox(cards, isSunFirstPhase = false) {
  if (!Array.isArray(cards) || cards.length < 3) {
    return { valid: false, reason: `Box harus minimal 3 kartu, dapat ${cards.length}` };
  }

  // Pisahkan Joker dan non-Joker
  const jokers = cards.filter(c => c.isJoker);
  const nonJokers = cards.filter(c => !c.isJoker);

  // Cek semua non-Joker angka sama
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
 * Check apakah pemain bisa main di awal ronde (Sun pertama)
 * - WAJIB keluarkan Sun (3+ kartu)
 * - ATAU BOX 5+ kartu jika tidak bisa Sun
 * - ATAU -50 & keluar
 */
export function checkFirstSun(playerCards) {
  const sunPossible = playerCards.some(combo => isValidSun(combo).valid);
  const boxPossible = playerCards.some(combo => 
    isValidBox(combo, true).valid && combo.length >= 5
  );

  return {
    canSun: sunPossible,
    canBox: boxPossible,
    canPlay: sunPossible || boxPossible
  };
}

/**
 * Check apakah pemain punya Cate Tangan (8 kartu Sun exact di awal)
 * @param {Array} playerCards - Semua kartu pemain
 * @returns {boolean}
 */
export function checkCateTangan(playerCards) {
  // Cek setiap kombinasi 8 kartu dari tangan
  // Tapi praktisnya, cek setiap suit apakah ada 8 kartu berurutan
  
  const bySuit = { '♠': [], '♥': [], '♣': [], '♦': [] };
  playerCards.forEach(c => {
    if (!c.isJoker) {
      bySuit[c.suit].push(c);
    }
  });

  for (const suit in bySuit) {
    const cards = bySuit[suit];
    
    // Cek apakah ada 8 kartu berurutan di suit ini
    for (let startIdx = 0; startIdx <= cards.length - 8; startIdx++) {
      const subset = cards.slice(startIdx, startIdx + 8);
      if (isValidSun(subset).valid) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check apakah kartu bisa disambung ke Sun yang sudah ada
 * @param {Array} sunCards - Kartu di Sun saat ini
 * @param {Array} playCard - Kartu yang akan di-play
 * @param {String} position - 'left', 'right', atau 'fill'
 * @returns {Object} { valid: boolean, reason: string }
 */
export function canExtendSun(sunCards, playCard, position) {
  if (!isValidSun(sunCards).valid) {
    return { valid: false, reason: 'Sun saat ini tidak valid' };
  }

  if (sunCards.length >= 13) {
    return { valid: false, reason: 'Sun sudah penuh (13 kartu max)' };
  }

  const newCards = [...sunCards, playCard];

  // Cek apakah dengan kartu baru, Sun tetap valid
  if (!isValidSun(newCards).valid) {
    return { valid: false, reason: 'Kartu tidak bisa disambung ke Sun ini' };
  }

  return { valid: true };
}

/**
 * Check apakah 1-2 kartu bisa disambung ke Sun (strict validation)
 * Rules:
 * - 1 kartu: harus langsung sebelum/sesudah Sun (tidak boleh skip), tidak boleh Joker alone
 * - 2 kartu: boleh ada Joker sebagai pengganti nilai, kartu harus berurutan
 * @param {Array} sunCards - Kartu di Sun saat ini
 * @param {Array} playCards - Array of 1-2 kartu yang akan di-play
 * @param {String} position - 'left' atau 'right'
 * @returns {Object} { valid: boolean, reason: string }
 */
export function canExtendSunMultiple(sunCards, playCards, position) {
  if (!isValidSun(sunCards).valid) {
    return { valid: false, reason: 'Sun saat ini tidak valid' };
  }

  if (sunCards.length + playCards.length > 13) {
    return { valid: false, reason: 'Exceed Sun max size (13)' };
  }

  const playCardsCount = playCards.length;
  if (playCardsCount < 1 || playCardsCount > 2) {
    return { valid: false, reason: 'Extend hanya boleh 1-2 kartu' };
  }

  // Check if all play cards same suit as Sun
  const sunSuit = sunCards.find(c => !c.isJoker)?.suit;
  const playSuit = playCards.find(c => !c.isJoker)?.suit;
  
  if (sunSuit && playSuit && sunSuit !== playSuit) {
    return { valid: false, reason: `Simbol harus sama dengan Sun (${sunSuit})` };
  }

  // Rule 1: Single card extend
  if (playCardsCount === 1) {
    const card = playCards[0];
    
    // Tidak boleh Joker sendiri
    if (card.isJoker) {
      return { valid: false, reason: 'Joker tidak boleh dikeluarkan sendiri' };
    }

    const sunFirst = sunCards[0];
    const sunLast = sunCards[sunCards.length - 1];
    let cardValue = getCardValue(card.rank);
    
    if (position === 'left') {
      const firstValue = getCardValue(sunFirst.rank);
      // A special case
      if (card.rank === 'A') {
        if (firstValue === 2) {
          cardValue = 1;
        } else {
          return { valid: false, reason: `A tidak bisa disambung di kiri` };
        }
      }
      // Try append & check dengan isValidSun - more flexible untuk handle Joker
      const testSun = [card, ...sunCards];
      if (!isValidSun(testSun).valid) {
        return { valid: false, reason: `Kartu tidak bisa disambung di kiri` };
      }
    } else if (position === 'right') {
      const lastValue = getCardValue(sunLast.rank);
      // A special case
      if (card.rank === 'A') {
        if (lastValue === 13) {
          cardValue = 14;
        } else {
          return { valid: false, reason: `A tidak bisa disambung di kanan` };
        }
      }
      // Try append & check dengan isValidSun - more flexible untuk handle Joker
      const testSun = [...sunCards, card];
      if (!isValidSun(testSun).valid) {
        return { valid: false, reason: `Kartu tidak bisa disambung di kanan` };
      }
    }
  }

  // Rule 2: Two card extend
  if (playCardsCount === 2) {
    // Joker boleh sebagai pengganti tapi tidak boleh keduanya Joker
    const jokerCount = playCards.filter(c => c.isJoker).length;
    if (jokerCount === 2) {
      return { valid: false, reason: 'Tidak boleh semua kartu Joker' };
    }

    // Sort by value (Joker value = 100 untuk sorting, treat separately)
    const nonJokers = playCards.filter(c => !c.isJoker);
    const jokers = playCards.filter(c => c.isJoker);
    
    if (nonJokers.length === 0) {
      return { valid: false, reason: 'Harus ada minimal 1 kartu non-Joker' };
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

    // Check apakah bisa disambung ke Sun
    const sunFirst = sunCards[0];
    const sunLast = sunCards[sunCards.length - 1];
    const firstPlayValue = getCardValue(nonJokers[0].rank);
    const lastPlayValue = nonJokers.length === 2 
      ? getCardValue(nonJokers[1].rank)
      : firstPlayValue;
    
    if (position === 'left') {
      const firstSunValue = getCardValue(sunFirst.rank);
      // Max value dari play cards harus exactly firstSunValue - 1 atau firstSunValue - 2
      const maxPlay = Math.max(firstPlayValue, lastPlayValue);
      if (maxPlay !== firstSunValue - 1 && maxPlay !== firstSunValue - 2) {
        return { valid: false, reason: `Tidak bisa extend kiri dengan nilai ini` };
      }
    } else if (position === 'right') {
      const lastSunValue = getCardValue(sunLast.rank);
      // Min value dari play cards harus exactly lastSunValue + 1 atau lastSunValue + 2
      const minPlay = Math.min(firstPlayValue, lastPlayValue);
      if (minPlay !== lastSunValue + 1 && minPlay !== lastSunValue + 2) {
        return { valid: false, reason: `Tidak bisa extend kanan dengan nilai ini` };
      }
    }
  }

  // Final check: Sun harus tetap valid setelah extend
  const newSunCards = position === 'left' 
    ? [...playCards, ...sunCards]
    : [...sunCards, ...playCards];
  
  if (!isValidSun(newSunCards).valid) {
    return { valid: false, reason: 'Sun tidak valid setelah extend' };
  }

  return { valid: true };
}

/**
 * Get all valid moves untuk pemain saat gilirannya
 * @param {Array} playerCards - Kartu di tangan pemain
 * @param {Array} sunList - Daftar Sun di meja
 * @param {Array} boxList - Daftar Box di meja
 * @returns {Array} Array of valid moves
 */
export function getValidMoves(playerCards, sunList = [], boxList = []) {
  const validMoves = [];

  // Check move: mainkan kartu ke Sun yang ada
  for (let sunIdx = 0; sunIdx < sunList.length; sunIdx++) {
    const sun = sunList[sunIdx];
    
    for (let cardIdx = 0; cardIdx < playerCards.length; cardIdx++) {
      const card = playerCards[cardIdx];
      
      // Cek bisa disambung ke kiri/kanan/tengah
      if (canExtendSun(sun, card, 'left').valid) {
        validMoves.push({
          type: 'extend_sun',
          sunIdx,
          cardIdx,
          position: 'left'
        });
      }
      if (canExtendSun(sun, card, 'right').valid) {
        validMoves.push({
          type: 'extend_sun',
          sunIdx,
          cardIdx,
          position: 'right'
        });
      }
    }
  }

  // Check move: buat Sun baru
  for (let i = 0; i < playerCards.length; i++) {
    for (let j = i + 1; j < playerCards.length; j++) {
      for (let k = j + 1; k < playerCards.length; k++) {
        const testCards = [playerCards[i], playerCards[j], playerCards[k]];
        if (isValidSun(testCards).valid) {
          validMoves.push({
            type: 'new_sun',
            cardIndices: [i, j, k]
          });
        }
      }
    }
  }

  // Check move: buat BOX baru (jika tidak di first Sun phase)
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
