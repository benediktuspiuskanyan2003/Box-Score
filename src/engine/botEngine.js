/**
 * botEngine.js — Logic Bot Level Hard (v2: scoring system)
 *
 * Pendekatan:
 * 1. Kumpulkan SEMUA opsi valid (new_son, new_box, extend_son, add_to_box)
 * 2. Hitung skor setiap opsi berdasarkan efisiensi & hemat joker
 * 3. Pilih opsi dengan skor terbaik
 * 4. Endgame: dump joker yang tidak terpakai kalau sisa kartu sedikit
 */

import { getCardValue } from './deckManager.js';
import {
  isValidSon,
  isValidBox,
  canExtendSonMultiple,
  jokerHasValidUse,
  detectSonJokerAmbiguity,
} from './cardValidator.js';

// ─────────────────────────────────────────────
// Time budget guard — supaya bot tidak freeze lama
// ─────────────────────────────────────────────
const BOT_TIME_BUDGET_MS = 800; // total waktu maksimal bot mikir per giliran

class TimeBudgetExceeded extends Error {}

function checkBudget(deadline) {
  if (Date.now() > deadline) {
    throw new TimeBudgetExceeded();
  }
}
// ─────────────────────────────────────────────
// Helper: kombinasi — dengan limit & budget check
// ─────────────────────────────────────────────
function getCombinations(arr, size, deadline, maxResults = 2000) {
  const result = [];
  function combine(start, current) {
    if (result.length >= maxResults) return; // ✅ stop kalau sudah kebanyakan
    if (current.length === size) {
      result.push([...current]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      if (result.length >= maxResults) return;
      checkBudget(deadline); // ✅ cek waktu tiap iterasi
      current.push(arr[i]);
      combine(i + 1, current);
      current.pop();
    }
  }
  combine(0, []);
  return result;
}

// ─────────────────────────────────────────────
// Card tracking: hitung kartu yang sudah terlihat (tangan bot + meja)
// Deck 2 set per rank+suit, jadi max 2 kartu identik
// ─────────────────────────────────────────────
function buildVisibleCardCount(hand, sons, boxes) {
  const count = {};

  const addCard = (card) => {
    const key = card.isJoker ? 'joker' : `${card.rank}-${card.suit}`;
    count[key] = (count[key] || 0) + 1;
  };

  hand.forEach(addCard);
  sons.forEach(son => son.cards.forEach(addCard));
  boxes.forEach(box => box.cards.forEach(addCard));

  return count;
}

function remainingOutside(card, visibleCount, maxJoker = 4) {
  const key = card.isJoker ? 'joker' : `${card.rank}-${card.suit}`;
  const maxCount = card.isJoker ? maxJoker : 2;
  return Math.max(0, maxCount - (visibleCount[key] || 0));
}

// ─────────────────────────────────────────────
// Cek apakah sebuah kartu di tangan punya "jalan"
// ─────────────────────────────────────────────
function isCardAlive(card, restOfHand, sons, boxes) {
  if (card.isJoker) return true;

  for (const son of sons) {
    if (canExtendSonMultiple(son.cards, [card], 'left', boxes).valid) return true;
    if (canExtendSonMultiple(son.cards, [card], 'right', boxes).valid) return true;
  }

  for (const box of boxes) {
    const testBox = [...box.cards, card];
    if (isValidBox(testBox).valid) return true;
  }

  for (let i = 0; i < restOfHand.length; i++) {
    for (let j = i + 1; j < restOfHand.length; j++) {
      const testSon = [card, restOfHand[i], restOfHand[j]];
      if (isValidSon(testSon).valid) return true;
    }
  }

  for (let i = 0; i < restOfHand.length; i++) {
    for (let j = i + 1; j < restOfHand.length; j++) {
      const testBox = [card, restOfHand[i], restOfHand[j]];
      if (isValidBox(testBox).valid) return true;
    }
  }

  return false;
}

function countDeadCards(remainingHand, sons, boxes) {
  let dead = 0;
  remainingHand.forEach((card, idx) => {
    const rest = remainingHand.filter((_, i) => i !== idx);
    if (!isCardAlive(card, rest, sons, boxes)) dead++;
  });
  return dead;
}

// ─────────────────────────────────────────────
// Kumpulkan SEMUA opsi SON baru yang valid
// ─────────────────────────────────────────────
function collectSonOptions(hand, isFirstSon, deadline) {
  const options = [];
  const indices = hand.map((_, i) => i);

  for (let size = 3; size <= Math.min(13, hand.length); size++) {
    checkBudget(deadline);
    const combos = getCombinations(indices, size, deadline);
    for (const combo of combos) {
      checkBudget(deadline);
      const cards = combo.map(idx => hand[idx]);
      if (isFirstSon && cards.some(c => c.isJoker)) continue;

      const validation = isValidSon(cards);
      if (validation.valid) {
        const jokerCount = cards.filter(c => c.isJoker).length;
        options.push({
          type: 'new_son',
          cardIndices: combo,
          cards,
          length: cards.length,
          jokerCount,
        });
      }
    }
  }

  return options;
}

// ─────────────────────────────────────────────
// Kumpulkan SEMUA opsi BOX baru yang valid
// ─────────────────────────────────────────────
function collectBoxOptions(hand, existingBoxes, isFirstSon, deadline) {
  const options = [];
  const minCards = isFirstSon ? 5 : 3;

  const ranksInBoxes = new Set(
    existingBoxes.flatMap(box =>
      box.cards.filter(c => !c.isJoker).map(c => c.rank)
    )
  );

  const byRank = {};
  hand.forEach((card, idx) => {
    if (!card.isJoker) {
      if (!byRank[card.rank]) byRank[card.rank] = [];
      byRank[card.rank].push(idx);
    }
  });

  const jokerIndices = hand
    .map((card, idx) => ({ card, idx }))
    .filter(({ card }) => card.isJoker)
    .map(({ idx }) => idx);

  for (const [rank, cardIndices] of Object.entries(byRank)) {
    checkBudget(deadline);
    if (ranksInBoxes.has(rank)) continue;

    const availableJokers = isFirstSon ? [] : jokerIndices;
    const maxTotal = Math.min(8, cardIndices.length + availableJokers.length);
    const maxJokerUsable = Math.min(availableJokers.length, maxTotal - cardIndices.length);

    for (let jokerUsed = 0; jokerUsed <= maxJokerUsable; jokerUsed++) {
      checkBudget(deadline);
      const totalCount = cardIndices.length + jokerUsed;
      if (totalCount < minCards) continue;
      if (totalCount > 8) continue;

      const combo = [...cardIndices, ...availableJokers.slice(0, jokerUsed)];
      const cards = combo.map(idx => hand[idx]);
      const validation = isValidBox(cards, isFirstSon);

      if (validation.valid) {
        options.push({
          type: 'new_box',
          cardIndices: combo,
          cards,
          length: cards.length,
          jokerCount: jokerUsed,
        });
      }
    }
  }

  return options;
}

// ─────────────────────────────────────────────
// Kumpulkan SEMUA opsi extend SON
// ─────────────────────────────────────────────
function collectExtendOptions(hand, sons, boxes, deadline) {
  const options = [];
  const indices = hand.map((_, i) => i);

  for (let sonIdx = 0; sonIdx < sons.length; sonIdx++) {
    checkBudget(deadline);
    const son = sons[sonIdx];
    if (son.cards.length >= 13) continue;

    for (let count = 1; count <= 2; count++) {
      const combos = getCombinations(indices, count, deadline);
      for (const combo of combos) {
        checkBudget(deadline);
        const cards = combo.map(idx => hand[idx]);
        const jokerCount = cards.filter(c => c.isJoker).length;

        const leftResult = canExtendSonMultiple(son.cards, cards, 'left', boxes);
        if (leftResult.valid) {
          options.push({
            type: 'extend_son',
            cardIndices: combo,
            sonIdx,
            position: 'left',
            length: cards.length,
            jokerCount,
          });
        }

        const rightResult = canExtendSonMultiple(son.cards, cards, 'right', boxes);
        if (rightResult.valid) {
          options.push({
            type: 'extend_son',
            cardIndices: combo,
            sonIdx,
            position: 'right',
            length: cards.length,
            jokerCount,
          });
        }
      }
    }
  }

  return options;
}

// ─────────────────────────────────────────────
// Kumpulkan SEMUA opsi add to BOX
// ─────────────────────────────────────────────
function collectAddToBoxOptions(hand, boxes, deadline) {
  const options = [];

  for (let boxIdx = 0; boxIdx < boxes.length; boxIdx++) {
    checkBudget(deadline);
    const box = boxes[boxIdx];
    const remainingSlot = 8 - box.cards.length;
    if (remainingSlot <= 0) continue;

    const boxRank = box.cards.find(c => !c.isJoker)?.rank;
    if (!boxRank) continue;

    const matchingIndices = hand
      .map((card, idx) => ({ card, idx }))
      .filter(({ card }) => card.rank === boxRank || card.isJoker)
      .map(({ idx }) => idx);

    const maxAdd = Math.min(2, remainingSlot, matchingIndices.length);
    for (let count = 1; count <= maxAdd; count++) {
      const combos = getCombinations(matchingIndices, count, deadline);
      for (const combo of combos) {
        checkBudget(deadline);
        const cards = combo.map(idx => hand[idx]);
        const jokerCount = cards.filter(c => c.isJoker).length;
        options.push({
          type: 'add_to_box',
          cardIndices: combo,
          boxIdx,
          length: cards.length,
          jokerCount,
        });
      }
    }
  }

  return options;
}

// ─────────────────────────────────────────────
// Scoring: hitung skor sebuah opsi
// ─────────────────────────────────────────────
function scoreOption(option, hand, sons, boxes, visibleCount, deadline) {
  checkBudget(deadline);
  let score = 0;

  score += option.length * 10;
  score -= option.jokerCount * 25;
  if (option.jokerCount === 0) score += 15;

  const usedIndices = new Set(option.cardIndices);
  const remainingHand = hand.filter((_, idx) => !usedIndices.has(idx));

  let simSons = sons;
  let simBoxes = boxes;

  if (option.type === 'new_son') {
    simSons = [...sons, { cards: option.cards }];
  } else if (option.type === 'new_box') {
    simBoxes = [...boxes, { cards: option.cards }];
  } else if (option.type === 'extend_son') {
    simSons = sons.map((son, idx) => {
      if (idx !== option.sonIdx) return son;
      const extendCards = option.cardIndices.map(i => hand[i]);
      const newCards = option.position === 'left'
        ? [...extendCards, ...son.cards]
        : [...son.cards, ...extendCards];
      return { ...son, cards: newCards };
    });
  } else if (option.type === 'add_to_box') {
    simBoxes = boxes.map((box, idx) => {
      if (idx !== option.boxIdx) return box;
      const addCards = option.cardIndices.map(i => hand[i]);
      return { ...box, cards: [...box.cards, ...addCards] };
    });
  }

  const deadCount = countDeadCards(remainingHand, simSons, simBoxes);
  score -= deadCount * 8;

  option.cardIndices.forEach(idx => {
    const card = hand[idx];
    if (!card.isJoker) {
      const outside = remainingOutside(card, visibleCount);
      if (outside === 0) score += 3;
    }
  });

  return score;
}

// ─────────────────────────────────────────────
// Endgame: cek apakah perlu dump joker
// ─────────────────────────────────────────────
function findEndgameJokerDump(hand, sons, boxes) {
  if (hand.length > 4) return null;

  for (let idx = 0; idx < hand.length; idx++) {
    const card = hand[idx];
    if (card.isJoker && !jokerHasValidUse(idx, hand, sons, boxes)) {
      return idx;
    }
  }
  return null;
}

// ─────────────────────────────────────────────
// Cek cate: apakah hand bisa habis total lewat satu SON
// ─────────────────────────────────────────────
function findCateMove(hand) {
  if (hand.length >= 3 && hand.length <= 13) {
    const validation = isValidSon(hand);
    if (validation.valid) {
      return {
        type: 'new_son',
        cardIndices: hand.map((_, idx) => idx),
        jokerPosition: 'auto',
      };
    }
  }
  return null;
}

// ─────────────────────────────────────────────
// Helper: pilih jokerPosition untuk new_son
// ─────────────────────────────────────────────
function resolveJokerPosition(cardIndices, hand) {
  const sonCards = cardIndices.map(idx => hand[idx]);
  const hasJoker = sonCards.some(c => c.isJoker);
  if (!hasJoker) return 'auto';

  const { ambiguous, options } = detectSonJokerAmbiguity(sonCards);
  if (ambiguous && options.length > 0) {
    if (options.includes('gap')) return 'gap';
    if (options.includes('kanan')) return 'kanan';
    return options[0];
  }
  return 'auto';
}

// ─────────────────────────────────────────────
// MAIN: Compute aksi bot terbaik
// ─────────────────────────────────────────────
export function computeBotAction(gameState, botPlayerIdx) {
  const bot = gameState.players[botPlayerIdx];
  if (!bot || bot.status !== 'active') return { type: 'pass' };

  const hand = bot.hand;
  const sons = gameState.meja.sons;
  const boxes = gameState.meja.boxes;
  const isFirstSon = gameState.phase === 'first_son';
  const alreadyDoneFirstSon = gameState.sonFirstCompleted?.includes(botPlayerIdx);

  const deadline = Date.now() + BOT_TIME_BUDGET_MS; // ✅ batas waktu mikir

  try {
    if (!isFirstSon) {
      const cateMove = findCateMove(hand);
      if (cateMove) return cateMove;
    }

    checkBudget(deadline);
    const sonOptions = collectSonOptions(hand, isFirstSon, deadline);
    checkBudget(deadline);
    const boxOptions = collectBoxOptions(hand, boxes, isFirstSon, deadline);

    if (isFirstSon && !alreadyDoneFirstSon) {
      const allFirstSonOptions = [...sonOptions, ...boxOptions];
      if (allFirstSonOptions.length === 0) {
        return { type: 'fail_first_son' };
      }

      const visibleCount = buildVisibleCardCount(hand, sons, boxes);
      let best = null;
      let bestScore = -Infinity;
      for (const opt of allFirstSonOptions) {
        checkBudget(deadline);
        const s = scoreOption(opt, hand, sons, boxes, visibleCount, deadline);
        if (s > bestScore) {
          bestScore = s;
          best = opt;
        }
      }

      if (best.type === 'new_son') {
        return {
          type: 'new_son',
          cardIndices: best.cardIndices,
          jokerPosition: resolveJokerPosition(best.cardIndices, hand),
        };
      }
      return { type: 'new_box', cardIndices: best.cardIndices };
    }

    checkBudget(deadline);
    const extendOptions = collectExtendOptions(hand, sons, boxes, deadline);
    checkBudget(deadline);
    const addOptions = collectAddToBoxOptions(hand, boxes, deadline);

    const allOptions = [...sonOptions, ...boxOptions, ...extendOptions, ...addOptions];

    if (allOptions.length > 0) {
      const visibleCount = buildVisibleCardCount(hand, sons, boxes);
      let best = null;
      let bestScore = -Infinity;

      for (const opt of allOptions) {
        checkBudget(deadline);
        const s = scoreOption(opt, hand, sons, boxes, visibleCount, deadline);
        if (s > bestScore) {
          bestScore = s;
          best = opt;
        }
      }

      return finalizeOption(best, hand);
    }

    const jokerDumpIdx = findEndgameJokerDump(hand, sons, boxes);
    if (jokerDumpIdx !== null) {
      return { type: 'throw_joker', cardIdx: jokerDumpIdx };
    }

    for (let idx = 0; idx < hand.length; idx++) {
      const card = hand[idx];
      if (card.isJoker && !jokerHasValidUse(idx, hand, sons, boxes)) {
        return { type: 'throw_joker', cardIdx: idx };
      }
    }

    return { type: 'pass' };

  } catch (err) {
    if (err instanceof TimeBudgetExceeded) {
      // ✅ FALLBACK: waktu habis — pakai strategi cepat & aman
      console.warn(`[Bot] Time budget exceeded for player ${botPlayerIdx}, using fallback`);
      return computeFallbackAction(gameState, botPlayerIdx);
    }
    // Error tak terduga lain — tetap fallback supaya game tidak macet
    console.error('[Bot] Unexpected error:', err);
    return computeFallbackAction(gameState, botPlayerIdx);
  }
}

function finalizeOption(best, hand) {
  if (!best) return { type: 'pass' };

  if (best.type === 'new_son') {
    return {
      type: 'new_son',
      cardIndices: best.cardIndices,
      jokerPosition: resolveJokerPosition(best.cardIndices, hand),
    };
  }
  if (best.type === 'new_box') {
    return { type: 'new_box', cardIndices: best.cardIndices };
  }
  if (best.type === 'extend_son') {
    return {
      type: 'extend_son',
      cardIndices: best.cardIndices,
      sonIdx: best.sonIdx,
      position: best.position,
    };
  }
  if (best.type === 'add_to_box') {
    return {
      type: 'add_to_box',
      cardIndices: best.cardIndices,
      boxIdx: best.boxIdx,
    };
  }
  return { type: 'pass' };
}

// ─────────────────────────────────────────────
// FALLBACK: strategi cepat saat waktu habis
// Tidak optimal, tapi DIJAMIN cepat (tidak ada kombinatorial)
// ─────────────────────────────────────────────
function computeFallbackAction(gameState, botPlayerIdx) {
  const bot = gameState.players[botPlayerIdx];
  const hand = bot.hand;
  const sons = gameState.meja.sons;
  const boxes = gameState.meja.boxes;
  const isFirstSon = gameState.phase === 'first_son';
  const alreadyDoneFirstSon = gameState.sonFirstCompleted?.includes(botPlayerIdx);

  // 1. Coba extend SON dengan 1 kartu (paling murah, O(n*m))
  if (!isFirstSon || alreadyDoneFirstSon) {
    for (let cardIdx = 0; cardIdx < hand.length; cardIdx++) {
      const card = hand[cardIdx];
      for (let sonIdx = 0; sonIdx < sons.length; sonIdx++) {
        const son = sons[sonIdx];
        if (canExtendSonMultiple(son.cards, [card], 'left', boxes).valid) {
          return { type: 'extend_son', cardIndices: [cardIdx], sonIdx, position: 'left' };
        }
        if (canExtendSonMultiple(son.cards, [card], 'right', boxes).valid) {
          return { type: 'extend_son', cardIndices: [cardIdx], sonIdx, position: 'right' };
        }
      }
    }

    // 2. Coba add to box dengan 1 kartu
    for (let cardIdx = 0; cardIdx < hand.length; cardIdx++) {
      const card = hand[cardIdx];
      for (let boxIdx = 0; boxIdx < boxes.length; boxIdx++) {
        const box = boxes[boxIdx];
        if (box.cards.length >= 8) continue;
        const boxRank = box.cards.find(c => !c.isJoker)?.rank;
        if (card.rank === boxRank || card.isJoker) {
          return { type: 'add_to_box', cardIndices: [cardIdx], boxIdx };
        }
      }
    }
  }

  // 3. Coba cari SON baru sederhana: ambil 3 kartu suit sama berurutan
  const minSonLen = isFirstSon ? 3 : 3;
  const bySuit = { '♠': [], '♥': [], '♦': [], '♣': [] };
  hand.forEach((card, idx) => {
    if (!card.isJoker) bySuit[card.suit].push({ idx, card });
  });

  for (const suit in bySuit) {
    const cards = bySuit[suit];
    if (cards.length < minSonLen) continue;
    const sorted = [...cards].sort((a, b) => getCardValue(a.card.rank) - getCardValue(b.card.rank));
    for (let start = 0; start <= sorted.length - 3; start++) {
      const slice = sorted.slice(start, start + 3);
      const testCards = slice.map(s => s.card);
      if (isFirstSon && testCards.some(c => c.isJoker)) continue;
      if (isValidSon(testCards).valid) {
        return {
          type: 'new_son',
          cardIndices: slice.map(s => s.idx),
          jokerPosition: 'auto',
        };
      }
    }
  }

  // 4. Coba cari BOX baru sederhana: 3+ kartu rank sama
  const minBoxLen = isFirstSon ? 5 : 3;
  const byRank = {};
  hand.forEach((card, idx) => {
    if (!card.isJoker) {
      if (!byRank[card.rank]) byRank[card.rank] = [];
      byRank[card.rank].push(idx);
    }
  });
  const ranksInBoxes = new Set(
    boxes.flatMap(box => box.cards.filter(c => !c.isJoker).map(c => c.rank))
  );
  for (const [rank, indices] of Object.entries(byRank)) {
    if (ranksInBoxes.has(rank)) continue;
    if (indices.length >= minBoxLen) {
      return { type: 'new_box', cardIndices: indices.slice(0, minBoxLen) };
    }
  }

  // 5. Fase first_son dan tidak ketemu apa-apa → gagal son
  if (isFirstSon && !alreadyDoneFirstSon) {
    return { type: 'fail_first_son' };
  }

  // 6. Buang joker kalau ada (tanpa cek valid use, asal aman dibuang di endgame)
  for (let idx = 0; idx < hand.length; idx++) {
    if (hand[idx].isJoker) {
      const stillUseful = sons.some(son =>
        canExtendSonMultiple(son.cards, [hand[idx]], 'left', boxes).valid ||
        canExtendSonMultiple(son.cards, [hand[idx]], 'right', boxes).valid
      );
      if (!stillUseful) {
        return { type: 'throw_joker', cardIdx: idx };
      }
    }
  }

  // 7. Tidak ada pilihan lain → pass
  return { type: 'pass' };
}