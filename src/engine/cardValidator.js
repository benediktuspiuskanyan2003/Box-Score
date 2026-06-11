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
 * @returns {Object} { valid: boolean, reason: string, aPosition: string }
 */
export function isValidSon(cards) {
  if (!Array.isArray(cards) || cards.length < 3 || cards.length > 13) {
    return { valid: false, reason: `Son harus 3-13 kartu, dapat ${cards.length}` };
  }

  const jokers = cards.filter(c => c.isJoker);
  const nonJokers = cards.filter(c => !c.isJoker);

  if (nonJokers.length === 0) {
    return { valid: false, reason: 'Son harus ada minimal 1 kartu non-Joker' };
  }

  const firstSuit = nonJokers[0].suit;
  if (!nonJokers.every(c => c.suit === firstSuit)) {
    return { valid: false, reason: 'Semua kartu di Son harus simbol sama' };
  }

  const isValid = isConsecutiveWithJokers(nonJokers, jokers.length);
  if (!isValid.valid) {
    return isValid;
  }

  return { valid: true, aPosition: isValid.aPosition };
}

/**
 * Hitung implied value kartu di posisi tertentu dalam son
 * Berguna saat ujung son adalah Joker
 */
function getImpliedValueAtPosition(sonCards, position) {
  const firstNonJoker = sonCards.find(c => !c.isJoker);
  const lastNonJoker = [...sonCards].reverse().find(c => !c.isJoker);

  if (!firstNonJoker || !lastNonJoker) return null;

  const firstNonJokerIdx = sonCards.indexOf(firstNonJoker);
  const firstNonJokerVal = getCardValue(firstNonJoker.rank);

  if (position === 'left') {
    return firstNonJokerVal - firstNonJokerIdx;
  } else {
    const lastNonJokerIdx = sonCards.lastIndexOf(lastNonJoker);
    const lastNonJokerVal = getCardValue(lastNonJoker.rank);
    const jokersOnRight = sonCards.length - 1 - lastNonJokerIdx;
    return lastNonJokerVal + jokersOnRight;
  }
}

/**
 * Check apakah kartu berurutan dengan support Joker
 * Khusus: A bisa jadi awal (1) ATAU akhir (14), tapi BUKAN keduanya
 */
function isConsecutiveWithJokers(nonJokers, jokerCount) {
  if (nonJokers.length === 0) {
    return { valid: false, reason: 'Tidak ada kartu non-Joker' };
  }

  const sorted = [...nonJokers].sort((a, b) => getCardValue(a.rank) - getCardValue(b.rank));
  const values = sorted.map(c => getCardValue(c.rank));
  const hasAce = values.includes(1);
  const hasLowCards = values.some(v => v >= 3 && v <= 7);
  const hasHighCards = values.some(v => v >= 11); // J, Q, K

  const scenarios = [];

  if (!hasAce) {
    scenarios.push(checkConsecutive(values, jokerCount, null));
  } else if (hasAce && hasLowCards && !hasHighCards) {
    // A + kartu rendah tanpa kartu tinggi → A sebagai 1 (awal)
    scenarios.push(checkConsecutive(values, jokerCount, 'awal'));
  } else if (hasAce && hasHighCards && !hasLowCards) {
    // A + kartu tinggi tanpa kartu rendah → A sebagai 14 (akhir)
    const valuesWithAas14 = values.map(v => v === 1 ? 14 : v);
    scenarios.push(checkConsecutive(valuesWithAas14, jokerCount, 'akhir'));
  } else if (hasAce) {
    // Ambiguous: prioritaskan berdasarkan konteks
    if (hasLowCards) {
      scenarios.push(checkConsecutive(values, jokerCount, 'awal'));
      if (hasHighCards) {
        const valuesWithAas14 = values.map(v => v === 1 ? 14 : v);
        scenarios.push(checkConsecutive(valuesWithAas14, jokerCount, 'akhir'));
      }
    } else {
      const valuesWithAas14 = values.map(v => v === 1 ? 14 : v);
      scenarios.push(checkConsecutive(valuesWithAas14, jokerCount, 'akhir'));
      scenarios.push(checkConsecutive(values, jokerCount, 'awal'));
    }
  }

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
  const unique = [...new Set(values)];
  if (unique.length !== values.length) {
    return { valid: false, aPosition, reason: 'Tidak boleh ada kartu rank yang sama dalam SON' };
  }

  const sorted = [...unique].sort((a, b) => a - b);

  if (sorted.length === 1) {
    return { valid: false, aPosition };
  }

  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const expectedLength = max - min + 1;
  const gaps = expectedLength - sorted.length;

  if (gaps <= jokerCount && expectedLength <= 13) {
    return { valid: true, aPosition };
  }

  return { valid: false, aPosition };
}

/**
 * Hitung rank-rank (numeric values) yang sudah diisi Joker dalam sebuah Son.
 */
function getJokerOccupiedValues(sonCards) {
  const nonJokers = sonCards.filter(c => !c.isJoker);
  const jokers = sonCards.filter(c => c.isJoker);

  if (jokers.length === 0) return new Set();
  if (nonJokers.length === 0) return new Set();

  let values = nonJokers.map(c => getCardValue(c.rank));

  const hasAce = values.includes(1);
  const hasHighCard = values.some(v => v >= 11);
  if (hasAce && hasHighCard) {
    values = values.map(v => v === 1 ? 14 : v);
  }

  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

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
 * Cek apakah son dengan joker memiliki 2 kemungkinan posisi yang valid
 * Contoh: Joker-Q-K bisa jadi J-Q-K atau Q-K-A
 * @returns { ambiguous: boolean, options: Array }
 */
export function detectSonJokerAmbiguity(cards) {
  const jokers = cards.filter(c => c.isJoker);
  const nonJokers = cards.filter(c => !c.isJoker);

  if (jokers.length === 0) {
    return { ambiguous: false, options: [] };
  }

  const sorted = [...nonJokers].sort((a, b) => getCardValue(a.rank) - getCardValue(b.rank));
  const values = sorted.map(c => getCardValue(c.rank));

  if (values.length === 0) {
    return { ambiguous: false, options: [] };
  }

  const minVal = values[0];
  const maxVal = values[values.length - 1];
  const range = maxVal - minVal + 1;
  const gaps = range - values.length;

  const options = [];

  // Cek apakah joker bisa mengisi gap di tengah
  if (gaps > 0 && gaps <= jokers.length) {
    options.push('gap');
  }

  const hasAce = values.includes(1);
  // Sisa joker setelah isi gap tengah
  const jokerCountAfterGap = Math.max(0, jokers.length - gaps);

  if (gaps === 0 || jokerCountAfterGap > 0) {
    const jokersForEdge = gaps === 0 ? jokers.length : jokerCountAfterGap;

    // Bisa extend kiri: nilai minimum setelah extend >= 3 (atau 1 jika ada A)
    const leftMin = minVal - jokersForEdge;
    const canExtendLeft = hasAce ? leftMin >= 1 : leftMin >= 3;

    // Bisa extend kanan: nilai maksimum setelah extend <= 14 (A)
    const rightMax = maxVal + jokersForEdge;
    const canExtendRight = rightMax <= 14;

    if (canExtendLeft) options.push('kiri');
    if (canExtendRight) options.push('kanan');
  }

  const ambiguous = options.length > 1;
  return { ambiguous, options };
}

/**
 * Check apakah pemain bisa main di awal ronde (Son pertama)
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
 */
export function isValidBox(cards, isSonFirstPhase = false) {
  if (!Array.isArray(cards)) {
    return { valid: false, reason: 'Format kartu tidak valid' };
  }

  const minCards = isSonFirstPhase ? 5 : 3;
  if (cards.length < minCards) {
    return {
      valid: false,
      reason: `Box harus minimal ${minCards} kartu${isSonFirstPhase ? ' di fase Son pertama' : ''}, dapat ${cards.length}`
    };
  }

  const jokers = cards.filter(c => c.isJoker);
  const nonJokers = cards.filter(c => !c.isJoker);

  if (nonJokers.length === 0) {
    return { valid: false, reason: 'Box harus ada minimal 1 kartu non-Joker' };
  }

  const firstRank = nonJokers[0].rank;
  if (!nonJokers.every(c => c.rank === firstRank)) {
    return { valid: false, reason: 'Semua kartu di Box harus angka/rank sama' };
  }

  if (cards.length > 8) {
    return { valid: false, reason: `Box tidak bisa lebih dari 8 kartu (max 8 ${firstRank})` };
  }

  return { valid: true };
}

function isRankInBoxes(rank, boxes) {
  if (!boxes || boxes.length === 0) return false;
  return boxes.some(box => 
    box.cards.some(c => !c.isJoker && c.rank === rank)
  );
}

/**
 * Check apakah kartu bisa disambung ke Son yang sudah ada (single card)
 */
export function canExtendSon(sonCards, playCard, position, boxes = []) {
  if (!isValidSon(sonCards).valid) {
    return { valid: false, reason: 'Son saat ini tidak valid' };
  }

  if (sonCards.length >= 13) {
    return { valid: false, reason: 'Son sudah penuh (13 kartu max)' };
  }

  if (!playCard.isJoker) {
    const jokerOccupied = getJokerOccupiedValues(sonCards);
    const cardValue = getCardValue(playCard.rank);
    if (jokerOccupied.has(cardValue)) {
      return { valid: false, reason: `Slot rank ${playCard.rank} sudah diisi Joker` };
    }
  }

  if (!playCard.isJoker && isRankInBoxes(playCard.rank, boxes)) {
    return { valid: false, reason: `Rank ${playCard.rank} sudah ada di BOX` };
  }

  const newCards = [...sonCards, playCard];
  if (!isValidSon(newCards).valid) {
    return { valid: false, reason: 'Kartu tidak bisa disambung ke Son ini' };
  }

  return { valid: true };
}

/**
 * Check apakah 1-2 kartu bisa disambung ke Son (strict validation)
 */
export function canExtendSonMultiple(sonCards, playCards, position, boxes = []) {
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

  const sonSuit = sonCards.find(c => !c.isJoker)?.suit;
  const playSuit = playCards.find(c => !c.isJoker)?.suit;

  if (sonSuit && playSuit && sonSuit !== playSuit) {
    return { valid: false, reason: `Simbol harus sama dengan Son (${sonSuit})` };
  }

  const jokerOccupied = getJokerOccupiedValues(sonCards);

  // Rule 1: Single card extend
  if (playCardsCount === 1) {
    const card = playCards[0];

    if (card.isJoker && isRankInBoxes(card.rank, boxes)) {
      return { valid: false, reason: `Rank ${card.rank} sudah ada di BOX, tidak bisa extend sendiri` };
    }

    const cardValue = getCardValue(card.rank);
    if (jokerOccupied.has(cardValue)) {
      return { valid: false, reason: `Slot rank ${card.rank} sudah diisi Joker di Son ini` };
    }

    const sonFirst = sonCards[0];
    const sonLast = sonCards[sonCards.length - 1];
    let cardVal = getCardValue(card.rank);

    if (position === 'left') {
      // Pakai implied value jika ujung son adalah Joker
      const firstSonValue = sonFirst.isJoker
        ? getImpliedValueAtPosition(sonCards, 'left')
        : getCardValue(sonFirst.rank);

      if (firstSonValue === null) {
        return { valid: false, reason: 'Tidak bisa menentukan nilai ujung Son' };
      }

      if (card.rank === 'A') {
      // A sebagai 1: valid jika ujung son bernilai 2 (joker mengisi 2) atau 3
      // Karena deck mulai 3, A(1) hanya valid jika firstSonValue === 2 atau 3
      // firstSonValue === 2 berarti ada Joker di posisi 2
      if (firstSonValue === 2 || firstSonValue === 3) {
        // A(1) tepat sebelum 2 atau 3
        const testSon = [card, ...sonCards];
        if (isValidSon(testSon).valid) {
          return { valid: true };
        }
      }
      return { valid: false, reason: 'A tidak bisa disambung di kiri Son ini' };
      }

      if (cardVal !== firstSonValue - 1) {
        return { valid: false, reason: `Kartu harus tepat sebelum kartu pertama Son` };
      }

      const testSon = [card, ...sonCards];
      if (!isValidSon(testSon).valid) {
        return { valid: false, reason: 'Kartu tidak bisa disambung di kiri' };
      }

    } else if (position === 'right') {
      // Pakai implied value jika ujung son adalah Joker
      const lastSonValue = sonLast.isJoker
        ? getImpliedValueAtPosition(sonCards, 'right')
        : getCardValue(sonLast.rank);

      if (lastSonValue === null) {
        return { valid: false, reason: 'Tidak bisa menentukan nilai ujung Son' };
      }

      // A di kanan: hanya valid jika ujung son adalah K (13)
      if (card.rank === 'A') {
        if (lastSonValue === 13) {
          cardVal = 14;
        } else {
          return { valid: false, reason: 'A tidak bisa disambung di kanan' };
        }
      }

      if (cardVal !== lastSonValue + 1) {
        return { valid: false, reason: `Kartu harus tepat setelah kartu terakhir Son` };
      }

      const testSon = [...sonCards, card];
      if (!isValidSon(testSon).valid) {
        return { valid: false, reason: 'Kartu tidak bisa disambung di kanan' };
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

    if (nonJokers.length === 0) {
      return { valid: false, reason: 'Harus ada minimal 1 kartu non-Joker' };
    }

    for (const card of nonJokers) {
      const cardValue = getCardValue(card.rank);
      if (jokerOccupied.has(cardValue)) {
        return { valid: false, reason: `Slot rank ${card.rank} sudah diisi Joker di Son ini` };
      }
    }

    if (nonJokers.length === 2) {
      const val1 = getCardValue(nonJokers[0].rank);
      const val2 = getCardValue(nonJokers[1].rank);
      const sorted = [val1, val2].sort((a, b) => a - b);

      if (sorted[1] - sorted[0] !== 1) {
        return { valid: false, reason: 'Dua kartu harus berurutan' };
      }
    }

    const sonFirst = sonCards[0];
    const sonLast = sonCards[sonCards.length - 1];
    const firstPlayValue = getCardValue(nonJokers[0].rank);
    const lastPlayValue = nonJokers.length === 2
      ? getCardValue(nonJokers[1].rank)
      : firstPlayValue;

    if (position === 'left') {
      // Pakai implied value jika ujung son adalah Joker
      const firstSonValue = sonFirst.isJoker
        ? getImpliedValueAtPosition(sonCards, 'left')
        : getCardValue(sonFirst.rank);
      const maxPlay = Math.max(firstPlayValue, lastPlayValue);
      if (maxPlay !== firstSonValue - 1 && maxPlay !== firstSonValue - 2) {
        return { valid: false, reason: 'Tidak bisa extend kiri dengan nilai ini' };
      }
    } else if (position === 'right') {
      // Pakai implied value jika ujung son adalah Joker
      const lastSonValue = sonLast.isJoker
        ? getImpliedValueAtPosition(sonCards, 'right')
        : getCardValue(sonLast.rank);
      const minPlay = Math.min(firstPlayValue, lastPlayValue);
      if (minPlay !== lastSonValue + 1 && minPlay !== lastSonValue + 2) {
        return { valid: false, reason: 'Tidak bisa extend kanan dengan nilai ini' };
      }
    }
  }

  // Final check
  const newSonCards = position === 'left'
    ? [...playCards, ...sonCards]
    : [...sonCards, ...playCards];

  if (!isValidSon(newSonCards).valid) {
    return { valid: false, reason: 'Son tidak valid setelah extend' };
  }

  return { valid: true };
}

// Helper: apakah joker bisa dipakai dalam move apapun
export function jokerHasValidUse(jokerIdx, playerCards, sonList, boxList) {
  const joker = playerCards[jokerIdx];

  // Cek extend son
  for (const son of sonList) {
    if (canExtendSon(son.cards, joker, 'left', boxList).valid) return true;
    if (canExtendSon(son.cards, joker, 'right', boxList).valid) return true;
  }

  // Cek new son (joker + 2 kartu lain)
  for (let i = 0; i < playerCards.length; i++) {
    if (i === jokerIdx) continue;
    for (let j = i + 1; j < playerCards.length; j++) {
      if (j === jokerIdx) continue;
      const testCards = [joker, playerCards[i], playerCards[j]];
      if (isValidSon(testCards).valid) return true;
    }
  }

  // Cek new box (joker + 2 kartu lain rank sama, tapi fase first_son butuh 5)
  for (let i = 0; i < playerCards.length; i++) {
    if (i === jokerIdx) continue;
    for (let j = i + 1; j < playerCards.length; j++) {
      if (j === jokerIdx) continue;
      const testCards = [joker, playerCards[i], playerCards[j]];
      if (isValidBox(testCards).valid) return true;
    }
  }

  return false;
}

/**
 * Get all valid moves untuk pemain saat gilirannya
 */
export function getValidMoves(playerCards, sonList = [], boxList = []) {
  const validMoves = [];

  for (let sonIdx = 0; sonIdx < sonList.length; sonIdx++) {
    const son = sonList[sonIdx];

    for (let cardIdx = 0; cardIdx < playerCards.length; cardIdx++) {
      const card = playerCards[cardIdx];

      if (canExtendSon(son.cards, card, 'left', boxList).valid) {
        validMoves.push({ type: 'extend_son', sonIdx, cardIdx, position: 'left' });
      }
      if (canExtendSon(son.cards, card, 'right', boxList).valid) {
        validMoves.push({ type: 'extend_son', sonIdx, cardIdx, position: 'right' });
      }
    }
  }

  for (let i = 0; i < playerCards.length; i++) {
    for (let j = i + 1; j < playerCards.length; j++) {
      for (let k = j + 1; k < playerCards.length; k++) {
        const testCards = [playerCards[i], playerCards[j], playerCards[k]];
        if (isValidSon(testCards).valid) {
          validMoves.push({ type: 'new_son', cardIndices: [i, j, k] });
        }
      }
    }
  }

  for (let i = 0; i < playerCards.length; i++) {
    for (let j = i + 1; j < playerCards.length; j++) {
      for (let k = j + 1; k < playerCards.length; k++) {
        const testCards = [playerCards[i], playerCards[j], playerCards[k]];
        if (isValidBox(testCards).valid) {
          validMoves.push({ type: 'new_box', cardIndices: [i, j, k] });
        }
      }
    }
  }

  const jokerIndices = playerCards
    .map((c, idx) => c.isJoker ? idx : -1)
    .filter(idx => idx !== -1);

  for (const jokerIdx of jokerIndices) {
    const joker = playerCards[jokerIdx];
    const canUseInSon = sonList.some(son =>
      canExtendSon(son.cards, joker, 'left', boxList).valid ||
      canExtendSon(son.cards, joker, 'right', boxList).valid
    );

    // Cek apakah joker bisa dipakai buat SON baru atau BOX baru
    // (joker sendiri tidak bisa, tapi dicek bersama kartu lain di existing logic)
    // Kalau tidak ada move valid dengan joker ini → boleh dibuang
    if (!canUseInSon) {
      validMoves.push({ type: 'throw_joker', cardIdx: jokerIdx });
    }
  }

  return validMoves;
}