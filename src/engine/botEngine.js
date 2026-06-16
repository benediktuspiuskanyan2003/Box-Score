/**
 * botEngine.js — Logic Bot Level Hard
 *
 * Prioritas aksi bot:
 * 1. Cate tangan (habiskan semua kartu sekaligus)
 * 2. SON baru (rangkaian terpanjang dulu)
 * 3. BOX baru (rank terbanyak dulu)
 * 4. Extend SON yang ada
 * 5. Add to BOX yang ada
 * 6. Buang Joker sia-sia
 * 7. Pas
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
// Helper: cari semua kombinasi dari array
// ─────────────────────────────────────────────
function getCombinations(arr, size) {
  const result = [];
  function combine(start, current) {
    if (current.length === size) {
      result.push([...current]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      current.push(arr[i]);
      combine(i + 1, current);
      current.pop();
    }
  }
  combine(0, []);
  return result;
}

// ─────────────────────────────────────────────
// Helper: cari SON terpanjang dari tangan
// ─────────────────────────────────────────────
function findBestSon(hand, isFirstSon = false) {
  const SUIT_ORDER = ['♠', '♥', '♦', '♣'];
  let bestSon = null;
  let bestLength = 0;

  // Pisahkan joker dan non-joker
  const jokers = hand
    .map((card, idx) => ({ card, idx }))
    .filter(({ card }) => card.isJoker);
  const nonJokers = hand
    .map((card, idx) => ({ card, idx }))
    .filter(({ card }) => !card.isJoker);

  // Jangan pakai joker di fase first_son
  const availableJokers = isFirstSon ? [] : jokers;

  for (const suit of SUIT_ORDER) {
    const suitCards = nonJokers
      .filter(({ card }) => card.suit === suit)
      .sort((a, b) => getCardValue(a.card.rank) - getCardValue(b.card.rank));

    if (suitCards.length < 3) continue;

    // Coba semua panjang dari max ke 3
    for (let len = Math.min(13, suitCards.length + availableJokers.length); len >= 3; len--) {
      // Coba setiap window posisi
      for (let start = 0; start <= suitCards.length - 1; start++) {
        // Ambil subset non-joker mulai dari 'start'
        const subset = suitCards.slice(start, start + len);
        if (subset.length < 3 && availableJokers.length === 0) continue;

        // Coba berbagai kombinasi non-joker + joker
        const minNeeded = Math.max(3, len - availableJokers.length);
        if (subset.length < minNeeded) continue;

        // Test dengan joker
        const testCards = [
          ...subset.map(({ card }) => card),
          ...availableJokers.slice(0, len - subset.length).map(({ card }) => card),
        ];

        if (testCards.length < 3) continue;

        const validation = isValidSon(testCards);
        if (validation.valid && testCards.length > bestLength) {
          bestLength = testCards.length;
          bestSon = {
            cardIndices: [
              ...subset.map(({ idx }) => idx),
              ...availableJokers.slice(0, len - subset.length).map(({ idx }) => idx),
            ],
            cards: testCards,
            length: testCards.length,
          };
        }
      }
    }
  }

  return bestSon;
}

// ─────────────────────────────────────────────
// Helper: cari BOX terbanyak dari tangan
// ─────────────────────────────────────────────
function findBestBox(hand, existingBoxes, isFirstSon = false) {
  const minCards = isFirstSon ? 5 : 3;

  // Rank yang sudah ada di meja
  const ranksInBoxes = new Set(
    existingBoxes.flatMap(box =>
      box.cards.filter(c => !c.isJoker).map(c => c.rank)
    )
  );

  const jokers = hand
    .map((card, idx) => ({ card, idx }))
    .filter(({ card }) => card.isJoker);

  const nonJokers = hand
    .map((card, idx) => ({ card, idx }))
    .filter(({ card }) => !card.isJoker);

  // Kelompokkan per rank
  const byRank = {};
  nonJokers.forEach(({ card, idx }) => {
    if (!byRank[card.rank]) byRank[card.rank] = [];
    byRank[card.rank].push({ card, idx });
  });

  let bestBox = null;
  let bestCount = 0;

  for (const [rank, cards] of Object.entries(byRank)) {
    // Skip rank yang sudah ada di meja
    if (ranksInBoxes.has(rank)) continue;

    // Jangan pakai joker di fase first_son
    const availableJokers = isFirstSon ? [] : jokers;
    const totalCount = cards.length + availableJokers.length;

    if (totalCount < minCards) continue;

    // Ambil sebanyak mungkin (max 8)
    const takeCards = cards.slice(0, Math.min(8, cards.length));
    const takeJokers = availableJokers.slice(0, Math.min(8 - takeCards.length, availableJokers.length));
    const testCards = [
      ...takeCards.map(({ card }) => card),
      ...takeJokers.map(({ card }) => card),
    ];

    if (testCards.length < minCards) continue;

    const validation = isValidBox(testCards, isFirstSon);
    if (validation.valid && testCards.length > bestCount) {
      bestCount = testCards.length;
      bestBox = {
        cardIndices: [
          ...takeCards.map(({ idx }) => idx),
          ...takeJokers.map(({ idx }) => idx),
        ],
        cards: testCards,
        count: testCards.length,
      };
    }
  }

  return bestBox;
}

// ─────────────────────────────────────────────
// Helper: cari extend SON terbaik
// ─────────────────────────────────────────────
function findBestExtendSon(hand, sons, boxes) {
  let bestExtend = null;
  let bestCardCount = 0;

  for (let sonIdx = 0; sonIdx < sons.length; sonIdx++) {
    const son = sons[sonIdx];
    if (son.cards.length >= 13) continue;

    // Coba 2 kartu dulu, lalu 1 kartu
    for (let count = 2; count >= 1; count--) {
      const indices = hand.map((_, i) => i);
      const combos = getCombinations(indices, count);

      for (const combo of combos) {
        const cards = combo.map(idx => hand[idx]);

        // Coba kiri
        const leftResult = canExtendSonMultiple(son.cards, cards, 'left', boxes);
        if (leftResult.valid && count > bestCardCount) {
          bestCardCount = count;
          bestExtend = {
            cardIndices: combo,
            sonIdx,
            position: 'left',
          };
        }

        // Coba kanan
        const rightResult = canExtendSonMultiple(son.cards, cards, 'right', boxes);
        if (rightResult.valid && count > bestCardCount) {
          bestCardCount = count;
          bestExtend = {
            cardIndices: combo,
            sonIdx,
            position: 'right',
          };
        }
      }
    }
  }

  return bestExtend;
}

// ─────────────────────────────────────────────
// Helper: cari add to BOX terbaik
// ─────────────────────────────────────────────
function findBestAddToBox(hand, boxes) {
  let bestAdd = null;
  let bestCount = 0;

  for (let boxIdx = 0; boxIdx < boxes.length; boxIdx++) {
    const box = boxes[boxIdx];
    if (box.cards.length >= 8) continue;

    const boxRank = box.cards.find(c => !c.isJoker)?.rank;
    if (!boxRank) continue;

    const matchingCards = hand
      .map((card, idx) => ({ card, idx }))
      .filter(({ card }) => card.rank === boxRank || card.isJoker);

    // Ambil max 2, pastikan tidak melebihi kapasitas box
    const maxAdd = Math.min(2, 8 - box.cards.length, matchingCards.length);
    if (maxAdd === 0) continue;

    const take = matchingCards.slice(0, maxAdd);
    if (take.length > bestCount) {
      bestCount = take.length;
      bestAdd = {
        cardIndices: take.map(({ idx }) => idx),
        boxIdx,
      };
    }
  }

  return bestAdd;
}

// ─────────────────────────────────────────────
// Helper: cari Joker yang bisa dibuang
// ─────────────────────────────────────────────
function findThrowableJoker(hand, sons, boxes) {
  for (let idx = 0; idx < hand.length; idx++) {
    const card = hand[idx];
    if (card.isJoker && !jokerHasValidUse(idx, hand, sons, boxes)) {
      return idx;
    }
  }
  return null;
}

// ─────────────────────────────────────────────
// Helper: cek apakah bot bisa habiskan semua kartu (cate)
// ─────────────────────────────────────────────
function findCateMove(hand, sons, boxes, isFirstSon) {
  // Cek apakah semua kartu bisa dimainkan dalam satu giliran
  // Strategi: coba buat SON sebesar mungkin dulu, lihat apakah sisa kartu bisa dimainkan

  // Untuk simplifikasi: cek apakah ada satu SON yang bisa menghabiskan semua kartu
  if (hand.length >= 3 && hand.length <= 13) {
    const validation = isValidSon(hand);
    if (validation.valid) {
      return {
        type: 'new_son',
        cardIndices: hand.map((_, idx) => idx),
      };
    }
  }

  return null;
}

// ─────────────────────────────────────────────
// MAIN: Compute aksi bot
// ─────────────────────────────────────────────
/**
 * Hitung aksi terbaik bot
 * @param {Object} gameState - State game saat ini
 * @param {number} botPlayerIdx - Index bot di array players
 * @returns {Object} Aksi yang harus dieksekusi
 *   { type: 'new_son' | 'new_box' | 'extend_son' | 'add_to_box' | 'throw_joker' | 'pass',
 *     cardIndices, sonIdx, boxIdx, position, jokerPosition }
 */
export function computeBotAction(gameState, botPlayerIdx) {
  const bot = gameState.players[botPlayerIdx];
  if (!bot || bot.status !== 'active') return { type: 'pass' };

  const hand = bot.hand;
  const sons = gameState.meja.sons;
  const boxes = gameState.meja.boxes;
  const isFirstSon = gameState.phase === 'first_son';
  const alreadyDoneFirstSon = gameState.sonFirstCompleted?.includes(botPlayerIdx);

  // ── 1. Cate: habiskan semua kartu ──
  if (!isFirstSon) {
    const cateMove = findCateMove(hand, sons, boxes, isFirstSon);
    if (cateMove) return cateMove;
  }

  // ── 2. SON baru ──
  const bestSon = findBestSon(hand, isFirstSon);
  if (bestSon && bestSon.length >= (isFirstSon ? 3 : 3)) {
    // Cek joker ambiguity
    const sonCards = bestSon.cardIndices.map(idx => hand[idx]);
    const hasJoker = sonCards.some(c => c.isJoker);
    let jokerPosition = 'auto';

    if (hasJoker && !isFirstSon) {
      const { ambiguous, options } = detectSonJokerAmbiguity(sonCards);
      if (ambiguous && options.length > 0) {
        // Bot pilih: gap dulu, lalu kanan, lalu kiri
        if (options.includes('gap')) jokerPosition = 'gap';
        else if (options.includes('kanan')) jokerPosition = 'kanan';
        else jokerPosition = options[0];
      }
    }

    return {
      type: 'new_son',
      cardIndices: bestSon.cardIndices,
      jokerPosition,
    };
  }

  // ── 3. BOX baru ──
  const bestBox = findBestBox(hand, boxes, isFirstSon);
  if (bestBox) {
    return {
      type: 'new_box',
      cardIndices: bestBox.cardIndices,
    };
  }

  // Di fase first_son, bot hanya bisa SON atau BOX
  if (isFirstSon && !alreadyDoneFirstSon) {
    return { type: 'fail_first_son' };
  }

  // ── 4. Extend SON ──
  const bestExtend = findBestExtendSon(hand, sons, boxes);
  if (bestExtend) {
    return {
      type: 'extend_son',
      cardIndices: bestExtend.cardIndices,
      sonIdx: bestExtend.sonIdx,
      position: bestExtend.position,
    };
  }

  // ── 5. Add to BOX ──
  const bestAdd = findBestAddToBox(hand, boxes);
  if (bestAdd) {
    return {
      type: 'add_to_box',
      cardIndices: bestAdd.cardIndices,
      boxIdx: bestAdd.boxIdx,
    };
  }

  // ── 6. Buang Joker sia-sia ──
  const throwableJoker = findThrowableJoker(hand, sons, boxes);
  if (throwableJoker !== null) {
    return {
      type: 'throw_joker',
      cardIdx: throwableJoker,
    };
  }

  // ── 7. Pas ──
  return { type: 'pass' };
}