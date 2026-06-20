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
 * @returns {Object}
 *   {
 *     ambiguous: boolean,        // true kalau ada >1 cara penempatan sisa joker
 *     gapJokerCount: number,     // berapa joker WAJIB dipakai isi gap tengah
 *     edgeJokerCount: number,    // sisa joker yang punya pilihan kiri/kanan
 *     minLeft: number,           // minimum joker edge yang boleh ditaruh di kiri
 *     maxLeft: number,           // maximum joker edge yang boleh ditaruh di kiri
 *     options: Array             // ['gap'] kalau ambiguous lama dipakai di tempat lain,
 *                                 // dipertahankan untuk kompatibilitas kode yang sudah ada
 *   }
 */
export function isValidSon(cards) {
  if (!Array.isArray(cards) || cards.length < 3 || cards.length > 13) {
    return { valid: false, reason: `Son harus 3-13 kartu, dapat ${cards.length}` };
  }
 
  const jokers = cards.filter(c => c.isJoker);
  const nonJokers = cards.filter(c => !c.isJoker);
 
  // ✅ FIX: minimal 2 kartu non-Joker, bukan 1.
  // Mencegah SON yang terlalu didominasi Joker seperti "6-Joker-Joker".
  if (nonJokers.length < 2) {
    return { valid: false, reason: 'Son harus ada minimal 2 kartu non-Joker' };
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
    // Cuma 1 nonJoker + sisanya joker semua di salah satu/kedua sisi.
    // Selalu bisa valid asal total panjang <= 13 dan tidak keluar batas rank.
    const totalLength = 1 + jokerCount;
    if (totalLength > 13) return { valid: false, aPosition };
    // Batas rank: minimal value setelah extend kiri sejauh mungkin harus >= batas bawah,
    // ATAU maksimal value setelah extend kanan sejauh mungkin harus <= batas atas.
    // Karena joker sisa bisa didistribusikan kiri/kanan secara bebas, selama jokerCount
    // tidak melebihi total slot yang tersedia di kedua sisi gabungan, ini valid.
    const lowerBound = 1; // rank terkecil adalah A=1, lalu 2,3,...
    const upperBound = 14; // joker boleh jadi A(14) di ujung kanan, tidak bergantung aPosition
    const maxSlotsAvailable = (sorted[0] - lowerBound) + (upperBound - sorted[0]);
    if (jokerCount > maxSlotsAvailable) return { valid: false, aPosition };
    return { valid: true, aPosition };
  }
 
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const expectedLength = max - min + 1;
  const gapJokerCount = expectedLength - sorted.length; // gap WAJIB di tengah
 
  if (gapJokerCount > jokerCount) {
    return { valid: false, aPosition }; // tidak cukup joker untuk isi gap wajib
  }
  if (expectedLength > 13) {
    return { valid: false, aPosition };
  }
 
  // Sisa joker setelah isi gap wajib
  const edgeJokerCount = jokerCount - gapJokerCount;
 
  if (edgeJokerCount === 0) {
    return { valid: true, aPosition }; // pas, tidak ada sisa
  }
 
  // Sisa joker harus bisa didistribusikan ke kiri dan/atau kanan
  // tanpa keluar batas rank, dan total panjang akhir tetap <= 13.
  const lowerBound = 1; // rank terkecil adalah A=1
  const upperBound = 14; // joker boleh jadi A(14) di ujung kanan
 
  const maxLeftSlots = min - lowerBound;   // slot tersedia di kiri sebelum keluar batas
  const maxRightSlots = upperBound - max;  // slot tersedia di kanan sebelum keluar batas
  const maxSlotsAvailable = maxLeftSlots + maxRightSlots;
 
  const finalLength = expectedLength + edgeJokerCount;
 
  if (edgeJokerCount > maxSlotsAvailable) {
    return { valid: false, aPosition }; // sisa joker tidak ada tempat valid
  }
  if (finalLength > 13) {
    return { valid: false, aPosition };
  }
 
  return { valid: true, aPosition };
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
    return { ambiguous: false, options: [], gapJokerCount: 0, edgeJokerCount: 0, minLeft: 0, maxLeft: 0 };
  }
 
  const sorted = [...nonJokers].sort((a, b) => getCardValue(a.rank) - getCardValue(b.rank));
  let values = sorted.map(c => getCardValue(c.rank));
 
  if (values.length === 0) {
    return { ambiguous: false, options: [], gapJokerCount: 0, edgeJokerCount: 0, minLeft: 0, maxLeft: 0 };
  }
 
  // Handle A sebagai 14 kalau ada kartu tinggi (J/Q/K) tanpa kartu rendah (3-7)
  // Konsisten dengan logic isConsecutiveWithJokers yang sudah ada.
  const hasAce = values.includes(1);
  const hasHighCards = values.some(v => v >= 11);
  const hasLowCards = values.some(v => v >= 3 && v <= 7);
  let aceAsHigh = false;
  if (hasAce && hasHighCards && !hasLowCards) {
    values = values.map(v => (v === 1 ? 14 : v));
    aceAsHigh = true;
  }
 
  const sortedUnique = [...new Set(values)].sort((a, b) => a - b);
  const minVal = sortedUnique[0];
  const maxVal = sortedUnique[sortedUnique.length - 1];
 
  // ── Hitung gap WAJIB di tengah (antar nonJoker yang sudah dipilih) ──
  // Setiap slot kosong antara minVal..maxVal yang belum terisi nonJoker
  // adalah gap yang WAJIB diisi joker.
  const filledSlots = new Set(sortedUnique);
  let gapJokerCount = 0;
  for (let v = minVal; v <= maxVal; v++) {
    if (!filledSlots.has(v)) gapJokerCount++;
  }
 
  // Tidak cukup joker untuk isi gap wajib -> kombinasi ini tidak valid sama sekali
  // (seharusnya sudah divalidasi sebelumnya oleh isValidSon, tapi dijaga di sini juga)
  if (gapJokerCount > jokers.length) {
    return { ambiguous: false, options: [], gapJokerCount, edgeJokerCount: 0, minLeft: 0, maxLeft: 0, invalid: true };
  }
 
  // ── Sisa joker setelah gap wajib terisi -> kandidat untuk edge (kiri/kanan) ──
  const edgeJokerCount = jokers.length - gapJokerCount;
 
  if (edgeJokerCount === 0) {
    // Tidak ada sisa joker, tidak ada pilihan apapun -> langsung valid otomatis
    return {
      ambiguous: false,
      options: [],
      gapJokerCount,
      edgeJokerCount: 0,
      minLeft: 0,
      maxLeft: 0,
    };
  }
 
  // ── Tentukan range jumlah joker edge yang boleh ditaruh di KIRI ──
  // Untuk setiap kemungkinan leftCount (0..edgeJokerCount), cek apakah
  // hasil akhir (kiri & kanan) masih dalam batas valid:
  //   - sisi kiri: minVal - leftCount >= 3 (atau >= 1 kalau aceAsLow di slot itu, jarang terjadi di edge kiri karena A selalu plg kecil)
  //   - sisi kanan: maxVal + rightCount <= 14 (kalau aceAsHigh, maxVal sudah 14 jadi rightCount harus 0)
  let minLeft = 0;
  let maxLeft = 0;
  let found = false;
 
  for (let leftCount = 0; leftCount <= edgeJokerCount; leftCount++) {
    const rightCount = edgeJokerCount - leftCount;
    const newMin = minVal - leftCount;
    const newMax = maxVal + rightCount;
 
    // Batas bawah: rank terkecil adalah A=1, lalu 2,3,...
    const lowerBoundOk = newMin >= 1;
    // Batas atas: joker boleh merepresentasikan A(14) di ujung kanan,
    // jadi batas atas selalu 14 -- TIDAK bergantung pada aceAsHigh
    // (aceAsHigh hanya relevan kalau ada kartu A ASLI di tangan yang sudah dipilih)
    const upperBoundOk = newMax <= 14;
 
    if (lowerBoundOk && upperBoundOk) {
      if (!found) {
        minLeft = leftCount;
        found = true;
      }
      maxLeft = leftCount;
    }
  }
 
  if (!found) {
    // Tidak ada kombinasi edge yang valid sama sekali
    return { ambiguous: false, options: [], gapJokerCount, edgeJokerCount, minLeft: 0, maxLeft: 0, invalid: true };
  }
 
  const ambiguous = maxLeft > minLeft; // ada lebih dari 1 pilihan leftCount yang valid
 
  return {
    ambiguous,
    options: ambiguous ? ['edge_split'] : [], // dipertahankan supaya kode lama yang cek options.length tidak crash
    gapJokerCount,
    edgeJokerCount,
    minLeft,
    maxLeft,
  };
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
 
    // ✅ FIX: cek isRankInBoxes untuk SEMUA kartu (joker maupun non-joker),
    // bukan cuma joker. Rank yang sudah diklaim BOX tidak boleh extend SON
    // sendirian -- baik itu kartu asli maupun joker yang merepresentasikan rank itu.
    if (!card.isJoker && isRankInBoxes(card.rank, boxes)) {
      return { valid: false, reason: `Rank ${card.rank} sudah ada di BOX, tidak bisa extend sendiri` };
    }
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
    // ✅ FIX: kalau salah satu kartu adalah A dan kartu lainnya K,
    // A harus dihitung sebagai 14 (bukan 1), karena A-setelah-K hanya
    // make sense sebagai 13-14, tidak pernah sebagai 1-13.
    const hasAce = nonJokers.some(c => c.rank === 'A');
    const hasKing = nonJokers.some(c => c.rank === 'K');
 
    const getValueForPair = (card) => {
      if (card.rank === 'A' && hasKing) return 14;
      return getCardValue(card.rank);
    };
 
    const val1 = getValueForPair(nonJokers[0]);
    const val2 = getValueForPair(nonJokers[1]);
    const sorted = [val1, val2].sort((a, b) => a - b);
 
    if (sorted[1] - sorted[0] !== 1) {
      return { valid: false, reason: 'Dua kartu harus berurutan' };
    }
  }

    const sonFirst = sonCards[0];
    const sonLast = sonCards[sonCards.length - 1];
 
    // ✅ FIX: pakai getValueForPair juga di sini supaya A=14 konsisten
    // (hasKing sudah dihitung di atas, scope-nya tetap terjangkau di sini
    //  karena masih dalam blok if (playCardsCount === 2) yang sama)
    const hasAceForPosition = nonJokers.some(c => c.rank === 'A');
    const hasKingForPosition = nonJokers.some(c => c.rank === 'K');
    const getValForPosition = (card) => {
      if (card.rank === 'A' && hasKingForPosition) return 14;
      return getCardValue(card.rank);
    };
 
    const firstPlayValue = getValForPosition(nonJokers[0]);
    const lastPlayValue = nonJokers.length === 2
      ? getValForPosition(nonJokers[1])
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