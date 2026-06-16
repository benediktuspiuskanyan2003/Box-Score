/**
 * Game Engine - Manage state game: players, turn, valid moves, dll
 */

import {
  createDeck,
  shuffleDeck,
  dealCards,
  getMinusValue,
  getCardValue
} from './deckManager.js';

import {
  isValidSon,
  isValidBox,
  checkFirstSon,
  checkCateTangan,
  canExtendSonMultiple,
  getValidMoves,
  jokerHasValidUse
} from './cardValidator.js';

/**
 * Helper: advance turn, skip non-active players
 */
function advanceTurn(gameState) {
  let nextIdx = (gameState.currentTurnIdx + 1) % gameState.players.length;
  let attempts = 0;
  while (gameState.players[nextIdx].status !== 'active' && attempts < gameState.players.length) {
    nextIdx = (nextIdx + 1) % gameState.players.length;
    attempts++;
  }
  gameState.currentTurnIdx = nextIdx;
}

/**
 * Helper: Calculate remaining card score untuk pemain
 */
function calculateRemainingScore(playerHand) {
  let minusTotal = 0;
  playerHand.forEach(card => {
    minusTotal += getMinusValue(card.rank);
  });
  return -minusTotal;
}

export function throwJoker(gameState, playerIdx, cardIdx) {
  const player = gameState.players[playerIdx];
  if (!player || player.status !== 'active') {
    return { success: false, reason: 'Pemain tidak aktif' };
  }
  if (gameState.currentTurnIdx !== playerIdx) {
    return { success: false, reason: 'Bukan giliran pemain ini' };
  }

  const card = player.hand[cardIdx];
  if (!card) return { success: false, reason: 'Kartu tidak ditemukan' };
  if (!card.isJoker) return { success: false, reason: 'Hanya Joker yang bisa dilempar' };

  // ✅ Validasi: joker ini memang tidak bisa dipakai di mana pun
  const canUse = jokerHasValidUse(cardIdx, player.hand, gameState.meja.sons, gameState.meja.boxes);
  if (canUse) {
    return { success: false, reason: 'Joker masih bisa digunakan, tidak bisa dilempar' };
  }

  // Buang joker ke "discard pile" atau cukup hilangkan dari tangan
  player.hand.splice(cardIdx, 1);

  gameState.history.push({
    playerIdx,
    action: 'throw_joker',
    timestamp: Date.now()
  });

  if (player.hand.length === 0) return handleCate(gameState, playerIdx);

  advanceTurn(gameState);
  return { success: true, gameState };
}

/**
 * Helper: Check if player has any valid moves
 */
function hasValidMoves(gameState, playerIdx) {
  const player = gameState.players[playerIdx];
  if (!player || player.status !== 'active') return false;
  const validMoves = getValidMoves(player.hand, gameState.meja.sons, gameState.meja.boxes);
  return validMoves.length > 0;
}

/**
 * Initialize game baru
 */
export function initializeGame(players, minusLimit = -300) {
  const deck = createDeck();
  const shuffled = shuffleDeck(deck);
  const { playerCards, remaining } = dealCards(shuffled, players.length);

  const cateTanganPlayers = [];
  players.forEach((player, idx) => {
    if (checkCateTangan(playerCards[idx])) {
      cateTanganPlayers.push({ playerId: player.id, score: 50 });
    }
  });

  const playerStates = players.map((player, idx) => ({
    id: player.id,
    name: player.name,
    isBot: player.isBot || false,
    hand: playerCards[idx] || [],
    score: 0,
    status: cateTanganPlayers.some(p => p.playerId === player.id) ? 'cate_tangan' : 'active',
    totalScore: 0
  }));

  const gameState = {
    players: playerStates,
    currentTurnIdx: 0,
    round: 1,
    phase: 'first_son',
    deck: remaining,
    meja: { sons: [], boxes: [] },
    history: [],
    minusLimit,
    gameOver: false,
    cateType: null,
    sonFirstCompleted: [],
    noWinner: false  // ✅ TAMBAHAN: flag untuk ronde tanpa pemenang
  };

  if (cateTanganPlayers.length > 0) {
    gameState.cateType = 'tangan';
    cateTanganPlayers.forEach(p => {
      const player = gameState.players.find(pl => pl.id === p.playerId);
      if (player) {
        player.status = 'cate_tangan';
        player.score = p.score;
      }
    });
  }

  return gameState;
}

/**
 * Main function: pemain main kartu ke Son (meja)
 */
export function playCardToSon(gameState, playerIdx, cardIdx, sonIdx, position = 'right') {
  const player = gameState.players[playerIdx];
  if (!player || player.status !== 'active') {
    return { success: false, reason: 'Pemain tidak aktif' };
  }
  if (gameState.currentTurnIdx !== playerIdx) {
    return { success: false, reason: 'Bukan giliran pemain ini' };
  }

  const card = player.hand[cardIdx];
  if (!card) return { success: false, reason: 'Kartu tidak ditemukan' };

  const son = gameState.meja.sons[sonIdx];
  if (!son) return { success: false, reason: 'Son tidak ditemukan' };

  const testCards = position === 'left' ? [card, ...son.cards] : [...son.cards, card];
  if (!isValidSon(testCards).valid) {
    return { success: false, reason: 'Kartu tidak bisa disambung ke Son ini' };
  }

  if (position === 'left') {
    son.cards.unshift(card);
  } else {
    son.cards.push(card);
  }

  player.hand.splice(cardIdx, 1);
  gameState.history.push({ playerIdx, action: 'play_to_son', sonIdx, position, timestamp: Date.now() });

  if (player.hand.length === 0) return handleCate(gameState, playerIdx);

  advanceTurn(gameState);
  return { success: true, gameState };
}

/**
 * Pemain buat Son baru
 * @param {string} jokerPosition - 'auto' | 'kiri' | 'kanan' | 'gap'
 */
export function playNewSon(gameState, playerIdx, cardIndices, jokerPosition = 'auto') {
  const player = gameState.players[playerIdx];
  if (!player || player.status !== 'active') {
    return { success: false, reason: 'Pemain tidak aktif' };
  }
  if (gameState.currentTurnIdx !== playerIdx) {
    return { success: false, reason: 'Bukan giliran pemain ini' };
  }
  if (gameState.phase === 'first_son' && gameState.sonFirstCompleted.includes(playerIdx)) {
    return { success: false, reason: 'Anda sudah membuat SON pertama di ronde ini' };
  }

  const cards = cardIndices.map(idx => player.hand[idx]).filter(c => c);
  if (cards.length < 3) {
    return { success: false, reason: 'Butuh minimal 3 kartu' };
  }

  // ✅ Blokir Joker di fase first_son
  if (gameState.phase === 'first_son') {
    if (cards.some(c => c.isJoker)) {
      return { success: false, reason: 'Joker tidak boleh digunakan untuk Son Pertama' };
    }
  }

  const validationResult = isValidSon(cards);
  if (!validationResult.valid) {
    return { success: false, reason: 'Tidak membentuk Son yang valid' };
  }

  const aPosition = validationResult.aPosition;

  if (gameState.phase === 'first_son') {
    gameState.sonFirstCompleted.push(playerIdx);
    const needSon = gameState.players
      .map((p, idx) => idx)
      .filter(idx => gameState.players[idx].status === 'active');
    if (gameState.sonFirstCompleted.length === needSon.length) {
      gameState.phase = 'play';
    }
  }

  // Pisahkan joker dan non-joker
  const nonJokers = cards.filter(c => !c.isJoker);
  const jokers = cards.filter(c => c.isJoker);

  // Sort non-jokers dengan A=14 jika aPosition === 'akhir'
  const sortedNonJokers = [...nonJokers].sort((a, b) => {
    let valA = getCardValue(a.rank);
    let valB = getCardValue(b.rank);
    if (aPosition === 'akhir') {
      if (a.rank === 'A') valA = 14;
      if (b.rank === 'A') valB = 14;
    }
    return valA - valB;
  });

  const getNumericalValue = (card) => {
    const v = getCardValue(card.rank);
    return (aPosition === 'akhir' && card.rank === 'A') ? 14 : v;
  };

  let sortedCards = [];

  if (jokers.length === 0) {
    sortedCards = sortedNonJokers;
  } else {
    const minVal = getNumericalValue(sortedNonJokers[0]);
    const maxVal = getNumericalValue(sortedNonJokers[sortedNonJokers.length - 1]);
    const filledValues = new Set(sortedNonJokers.map(c => getNumericalValue(c)));

    let jokerPool = [...jokers];
    const builtCards = [];

    // Isi range minVal..maxVal dulu (gap tengah)
    for (let v = minVal; v <= maxVal; v++) {
      if (filledValues.has(v)) {
        builtCards.push(sortedNonJokers.find(c => getNumericalValue(c) === v));
      } else if (jokerPool.length > 0) {
        builtCards.push(jokerPool.shift());
      }
    }

    // Sisa joker setelah isi gap → posisikan sesuai jokerPosition
    if (jokerPool.length > 0) {
      if (jokerPosition === 'kiri') {
        sortedCards = [...jokerPool, ...builtCards];
      } else {
        // Default / 'kanan' / 'auto': append ke kanan
        sortedCards = [...builtCards, ...jokerPool];
      }
    } else {
      sortedCards = builtCards;
    }
  }

  const newSon = {
    id: `son_${Date.now()}`,
    cards: sortedCards,
    playerId: player.id
  };

  gameState.meja.sons.push(newSon);

  const sortedIndices = [...cardIndices].sort((a, b) => b - a);
  for (const idx of sortedIndices) {
    player.hand.splice(idx, 1);
  }

  gameState.history.push({
    playerIdx,
    action: 'new_son',
    sonId: newSon.id,
    cardCount: cards.length,
    timestamp: Date.now()
  });

  if (player.hand.length === 0) return handleCate(gameState, playerIdx);

  advanceTurn(gameState);
  return { success: true, gameState };
}

/**
 * Pemain buat BOX baru
 */
export function playNewBox(gameState, playerIdx, cardIndices) {
  const player = gameState.players[playerIdx];
  if (!player || player.status !== 'active') {
    return { success: false, reason: 'Pemain tidak aktif' };
  }
  if (gameState.currentTurnIdx !== playerIdx) {
    return { success: false, reason: 'Bukan giliran pemain ini' };
  }

  const cards = cardIndices.map(idx => player.hand[idx]).filter(c => c);
  const nonJokerCard = cards.find(c => !c.isJoker);
  if (nonJokerCard) {
    const rankAlreadyInBox = gameState.meja.boxes.some(box =>
      box.cards.some(c => !c.isJoker && c.rank === nonJokerCard.rank)
    );
    if (rankAlreadyInBox) {
      return { 
        success: false, 
        reason: `Rank ${nonJokerCard.rank} sudah ada di BOX, tambahkan ke BOX yang ada (max 2 kartu)` 
      };
    }
  }
  const minCards = gameState.phase === 'first_son' ? 5 : 3;
  if (cards.length < minCards) {
    return { success: false, reason: `Butuh minimal ${minCards} kartu untuk BOX` };
  }

  if (gameState.phase === 'first_son') {
    if (cards.some(c => c.isJoker)) {
      return { success: false, reason: 'Joker tidak boleh digunakan untuk BOX Pertama' };
    }
  }
  
  if (!isValidBox(cards, gameState.phase === 'first_son').valid) {
    return { success: false, reason: 'Tidak membentuk Box yang valid' };
  }

  const newBox = {
    id: `box_${Date.now()}`,
    cards,
    playerId: player.id
  };

  gameState.meja.boxes.push(newBox);

  const sortedIndices = [...cardIndices].sort((a, b) => b - a);
  for (const idx of sortedIndices) {
    player.hand.splice(idx, 1);
  }

  if (gameState.phase === 'first_son' && !gameState.sonFirstCompleted.includes(playerIdx)) {
    gameState.sonFirstCompleted.push(playerIdx);

    const activePlayers = gameState.players
      .map((p, idx) => idx)
      .filter(idx => gameState.players[idx].status === 'active');

    const allDone = activePlayers.every(idx => gameState.sonFirstCompleted.includes(idx));

    if (allDone) {
      gameState.phase = 'play';
    }
  }

  gameState.history.push({
    playerIdx,
    action: 'new_box',
    boxId: newBox.id,
    cardCount: cards.length,
    timestamp: Date.now()
  });

  if (player.hand.length === 0) return handleCate(gameState, playerIdx);

  advanceTurn(gameState);
  return { success: true, gameState };
}

/**
 * Pemain extend SON yang sudah ada
 */
export function extendSon(gameState, playerIdx, cardIdx, sonIdx, position = 'right') {
  const player = gameState.players[playerIdx];
  if (!player || player.status !== 'active') {
    return { success: false, reason: 'Pemain tidak aktif' };
  }
  if (gameState.currentTurnIdx !== playerIdx) {
    return { success: false, reason: 'Bukan giliran pemain ini' };
  }

  const son = gameState.meja.sons[sonIdx];
  if (!son) return { success: false, reason: 'SON tidak ditemukan' };
  if (son.cards.length >= 13) return { success: false, reason: 'SON sudah penuh (13 kartu max)' };

  let cardIndices = Array.isArray(cardIdx) ? cardIdx : [cardIdx];
  const cards = cardIndices.map(idx => player.hand[idx]).filter(c => c !== undefined);

  if (cards.length === 0) return { success: false, reason: 'Kartu tidak ditemukan' };
  if (cards.length > 2) return { success: false, reason: 'Extend hanya boleh 1-2 kartu' };

  const validation = canExtendSonMultiple(son.cards, cards, position, gameState.meja.boxes);
  if (!validation.valid) {
    return { success: false, reason: validation.reason };
  }

  if (position === 'left') {
    const sortedCards = [...cards].sort((a, b) => getCardValue(a.rank) - getCardValue(b.rank));
    son.cards = [...sortedCards, ...son.cards];
  } else {
    const sortedCards = [...cards].sort((a, b) => getCardValue(a.rank) - getCardValue(b.rank));
    son.cards = [...son.cards, ...sortedCards];
  }

  const sortedIndices = [...cardIndices].sort((a, b) => b - a);
  for (const idx of sortedIndices) {
    player.hand.splice(idx, 1);
  }

  gameState.history.push({
    playerIdx,
    action: 'extend_son',
    sonIdx,
    position,
    cardCount: cards.length,
    timestamp: Date.now()
  });

  if (player.hand.length === 0) return handleCate(gameState, playerIdx);

  advanceTurn(gameState);
  return { success: true, gameState };
}

/**
 * Pemain add kartu ke BOX yang sudah ada
 */
export function addToBox(gameState, playerIdx, cardIndices, boxIdx) {
  const player = gameState.players[playerIdx];
  if (!player || player.status !== 'active') {
    return { success: false, reason: 'Pemain tidak aktif' };
  }
  if (gameState.currentTurnIdx !== playerIdx) {
    return { success: false, reason: 'Bukan giliran pemain ini' };
  }

  // ✅ Normalisasi: bisa single index atau array
  const indices = Array.isArray(cardIndices) ? cardIndices : [cardIndices];
  if (indices.length < 1 || indices.length > 2) {
    return { success: false, reason: 'Hanya boleh menambah 1 atau 2 kartu ke BOX' };
  }

  const cards = indices.map(idx => player.hand[idx]).filter(c => c);
  if (cards.length !== indices.length) {
    return { success: false, reason: 'Kartu tidak ditemukan' };
  }

  const box = gameState.meja.boxes[boxIdx];
  if (!box) return { success: false, reason: 'BOX tidak ditemukan' };

  // ✅ Cek kapasitas sebelum tambah
  if (box.cards.length + cards.length > 8) {
    return { success: false, reason: 'BOX akan melebihi batas maksimal 8 kartu' };
  }

  // ✅ Cari rank dari non-Joker pertama di box
  const boxRank = box.cards.find(c => !c.isJoker)?.rank;
  if (!boxRank) {
    return { success: false, reason: 'BOX tidak memiliki kartu non-Joker' };
  }

  // ✅ Validasi semua kartu yang akan ditambahkan
  for (const card of cards) {
    if (card.rank !== boxRank && !card.isJoker) {
      return { success: false, reason: `Semua kartu harus rank ${boxRank}` };
    }
  }

  // ✅ Masukkan semua kartu ke box
  cards.forEach(card => box.cards.push(card));

  // ✅ Hapus dari tangan (dari index terbesar dulu agar index tidak geser)
  const sortedIndices = [...indices].sort((a, b) => b - a);
  for (const idx of sortedIndices) {
    player.hand.splice(idx, 1);
  }

  gameState.history.push({
    playerIdx,
    action: 'add_to_box',
    boxIdx,
    cardCount: cards.length,
    timestamp: Date.now()
  });

  if (player.hand.length === 0) return handleCate(gameState, playerIdx);

  advanceTurn(gameState);
  return { success: true, gameState };
}



/**
 * Pemain pass
 * ✅ UPDATE: Deteksi semua pass tanpa ada CATE → set noWinner: true
 */
export function playerPass(gameState, playerIdx) {
  const player = gameState.players[playerIdx];
  if (!player || player.status !== 'active') {
    return { success: false, reason: 'Pemain tidak aktif' };
  }
  if (gameState.currentTurnIdx !== playerIdx) {
    return { success: false, reason: 'Bukan giliran pemain ini' };
  }

  // Hitung skor sisa kartu SEKARANG, sebelum kartu di-reset
  player.score = calculateRemainingScore(player.hand);
  player.status = 'passed';

  gameState.history.push({
    playerIdx,
    action: 'pass',
    score: player.score,
    timestamp: Date.now()
  });

  // Cek apakah masih ada pemain active
  const stillActive = gameState.players.filter(p => p.status === 'active').length;

  if (stillActive === 0) {
    // Pastikan semua pemain yang belum punya skor dihitung
    gameState.players.forEach(p => {
      if (p.status !== 'cate' && p.status !== 'cate_tangan' && p.score === 0) {
        p.score = calculateRemainingScore(p.hand);
      }
    });

    // ✅ TAMBAHAN: Cek apakah ada pemenang CATE
    const hasCateWinner = gameState.players.some(
      p => p.status === 'cate' || p.status === 'cate_tangan'
    );

    // ✅ TAMBAHAN: Kalau tidak ada CATE → noWinner = true, tidak ada yang dapat +50
    gameState.noWinner = !hasCateWinner;
    gameState.phase = 'round_end';

    return { success: true, gameState, roundEnd: true };
  }

  advanceTurn(gameState);
  return { success: true, gameState };
}

/**
 * Handle CATE (pemain kartu habis)
 */
function handleCate(gameState, playerIdx) {
  const player = gameState.players[playerIdx];

  player.status = 'cate';
  gameState.cateType = 'normal';

  const jokerCount = player.hand.filter(c => c.isJoker).length;
  const score = jokerCount > 0 ? jokerCount * 100 : 50;
  player.score = score;

  gameState.players.forEach((p) => {
    if (p.status === 'active') {
      let minusTotal = 0;
      p.hand.forEach(card => {
        minusTotal += getMinusValue(card.rank);
      });
      const jokerPenalty = p.hand.filter(c => c.isJoker).length * 100;
      p.score = -(minusTotal + jokerPenalty);
    }
  });

  gameState.phase = 'round_end';
  return { success: true, gameState, roundEnd: true };
}

/**
 * Declare player gagal Son pertama
 */
export function declareFailFirstSon(gameState, playerIdx) {
  const player = gameState.players[playerIdx];
  if (!player || player.status !== 'active') {
    return { success: false, reason: 'Pemain tidak aktif' };
  }
  if (gameState.currentTurnIdx !== playerIdx) {
    return { success: false, reason: 'Bukan giliran pemain ini' };
  }

  const prevFailCount = gameState.players.filter(p => p.status === 'son_failed').length;
  const playerCount = gameState.players.length;

  let willRestart = false;
  if (playerCount === 4) {
    willRestart = true;
  } else if (playerCount === 5) {
    willRestart = (prevFailCount + 1) >= 2;
  }

  if (willRestart) {
    gameState.history.push({
      playerIdx,
      action: 'declare_fail_son',
      failCount: prevFailCount + 1,
      note: 'restart',
      timestamp: Date.now()
    });
    return { success: true, restart: true };
  } else {
    player.status = 'son_failed';
    player.score = -50;

    gameState.history.push({
      playerIdx,
      action: 'declare_fail_son',
      failCount: prevFailCount + 1,
      score: -50,
      timestamp: Date.now()
    });

    advanceTurn(gameState);
    return { success: true, restart: false, gameState };
  }
}

/**
 * Get round scores untuk save ke Supabase
 */
export function getRoundScores(gameState, roundNumber) {
  return gameState.players.map(player => ({
    player_id: player.id,
    is_cate: player.status === 'cate',
    son_failed: player.status === 'son_failed',
    card_score: player.status === 'active' ? 0 : calculateCardScore(player.hand),
    round_total: player.score,
    score_reset: false
  }));
}

function calculateCardScore(hand) {
  return hand.reduce((sum, card) => sum + getMinusValue(card.rank), 0);
}

/**
 * Next Round
 * ✅ UPDATE: Reset noWinner flag saat mulai ronde baru
 */
export function nextRound(gameState) {
  if (gameState.phase !== 'round_end') {
    return { success: false, reason: 'Game harus dalam phase round_end' };
  }

  // Akumulasi score ke totalScore — berlaku untuk semua kasus termasuk noWinner
  gameState.players.forEach((player) => {
    if (!player.totalScore) player.totalScore = 0;
    player.totalScore += player.score;
  });

  const deck = createDeck();
  const shuffled = shuffleDeck(deck);
  const playerCount = gameState.players.length;
  const { playerCards, remaining } = dealCards(shuffled, playerCount);

  const cateTanganPlayers = [];
  gameState.players.forEach((player, idx) => {
    if (checkCateTangan(playerCards[idx])) {
      cateTanganPlayers.push({ playerId: player.id, score: 50 });
    }
  });

  gameState.players.forEach((player, idx) => {
    player.hand = playerCards[idx] || [];
    player.score = 0;
    player.isBot = player.isBot || false;
    if (cateTanganPlayers.some(p => p.playerId === player.id)) {
      player.status = 'cate_tangan';
      player.score = 50;
    } else {
      player.status = 'active';
    }
  });

  let highestScoreIdx = 0;
  let highestScore = gameState.players[0].totalScore;
  gameState.players.forEach((player, idx) => {
    if (player.totalScore > highestScore) {
      highestScore = player.totalScore;
      highestScoreIdx = idx;
    }
  });

  gameState.round += 1;
  gameState.currentTurnIdx = highestScoreIdx;
  gameState.phase = 'first_son';
  gameState.deck = remaining;
  gameState.meja = { sons: [], boxes: [] };
  gameState.cateType = cateTanganPlayers.length > 0 ? 'tangan' : null;
  gameState.sonFirstCompleted = [];
  gameState.history = [];
  gameState.noWinner = false;  // ✅ TAMBAHAN: reset flag noWinner

  return { success: true, gameState };
}