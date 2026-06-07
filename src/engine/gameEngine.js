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
  getValidMoves
} from './cardValidator.js';

/**
 * Helper: Calculate remaining card score untuk pemain
 */
function calculateRemainingScore(playerHand) {
  let minusTotal = 0;
  
  // Sum semua kartu sisa
  playerHand.forEach(card => {
    minusTotal += getMinusValue(card.rank);
  });
  
  return -minusTotal; // Return as negative (minus score)
}

/**
 * Helper: Check if player has any valid moves
 */
function hasValidMoves(gameState, playerIdx) {
  const player = gameState.players[playerIdx];
  if (!player || player.status !== 'active') {
    return false;
  }
  
  const validMoves = getValidMoves(player.hand, gameState.meja.suns, gameState.meja.boxes);
  return validMoves.length > 0;
}

/**
 * Initialize game baru
 * @param {Array} players - [{id, name}, ...]
 * @param {number} minusLimit - Batas minus (-300, -400, dst)
 */
export function initializeGame(players, minusLimit = -300) {
  // Shuffle & deal
  const deck = createDeck();
  const shuffled = shuffleDeck(deck);
  const { playerCards, remaining } = dealCards(shuffled, players.length);

  // Check Cate Tangan untuk setiap pemain
  const cateTanganPlayers = [];
  players.forEach((player, idx) => {
    if (checkCateTangan(playerCards[idx])) {
      cateTanganPlayers.push({
        playerId: player.id,
        score: 50
      });
    }
  });

  // Initialize player hands & state
  const playerStates = players.map((player, idx) => ({
    id: player.id,
    name: player.name,
    hand: playerCards[idx] || [],
    score: 0,
    status: cateTanganPlayers.some(p => p.playerId === player.id) ? 'cate_tangan' : 'active',
    totalScore: 0
  }));

  const gameState = {
    players: playerStates,
    currentTurnIdx: 0, // Pemain pertama mulai (biasanya yang kocok)
    round: 1,
    phase: 'first_son', // first_son, play, check_cate
    deck: remaining, // Kartu sisa yang tidak dibagikan
    meja: {
      sons: [], // [{id, cards, playerId}]
      boxes: [] // [{id, cards, playerId}]
    },
    history: [], // [{playerIdx, action, timestamp}]
    minusLimit,
    gameOver: false,
    cateType: null, // 'tangan', 'normal', 'none'
    sonFirstCompleted: [] // Pemain yang sudah keluarkan Son pertama
  };

  // Cek apakah ada Cate Tangan
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
  if (!card) {
    return { success: false, reason: 'Kartu tidak ditemukan' };
  }

  const son = gameState.meja.sons[sonIdx];
  if (!son) {
    return { success: false, reason: 'Son tidak ditemukan' };
  }

  // Validasi: kartu bisa disambung ke Son
  const testCards = position === 'left'
    ? [card, ...son.cards]
    : [...son.cards, card];

  if (!isValidSon(testCards).valid) {
    return { success: false, reason: 'Kartu tidak bisa disambung ke Son ini' };
  }

  // Update Son
  if (position === 'left') {
    son.cards.unshift(card);
  } else {
    son.cards.push(card);
  }

  // Remove kartu dari hand
  player.hand.splice(cardIdx, 1);

  // Record move
  gameState.history.push({
    playerIdx,
    action: 'play_to_son',
    sonIdx,
    position,
    timestamp: Date.now()
  });

  // Check CATE
  if (player.hand.length === 0) {
    return handleCate(gameState, playerIdx);
  }

  // Next turn
  gameState.currentTurnIdx = (gameState.currentTurnIdx + 1) % gameState.players.length;

  return { success: true, gameState };
}

/**
 * Pemain buat Son baru
 */
export function playNewSon(gameState, playerIdx, cardIndices) {
  const player = gameState.players[playerIdx];
  if (!player || player.status !== 'active') {
    return { success: false, reason: 'Pemain tidak aktif' };
  }

  if (gameState.currentTurnIdx !== playerIdx) {
    return { success: false, reason: 'Bukan giliran pemain ini' };
  }

  // Enforce first SON phase: pemain harus belum membuat Son pertama
  if (gameState.phase === 'first_son') {
    if (gameState.sonFirstCompleted.includes(playerIdx)) {
      return { success: false, reason: 'Anda sudah membuat SON pertama di ronde ini' };
    }
  }

  // Extract cards
  const cards = cardIndices.map(idx => player.hand[idx]).filter(c => c);
  if (cards.length < 3) {
    return { success: false, reason: 'Butuh minimal 3 kartu' };
  }

  // Validasi
  if (!isValidSon(cards).valid) {
    return { success: false, reason: 'Tidak membentuk Son yang valid' };
  }

  // Di fase first_son, Son harus dari pemain yang turn-nya sekarang
  if (gameState.phase === 'first_son') {
    // OK, first son bisa dibuat
    gameState.sonFirstCompleted.push(playerIdx);
    
    // Cek apakah semua pemain sudah keluarkan Son pertama
    const needSon = gameState.players
      .map((p, idx) => idx)
      .filter(idx => gameState.players[idx].status === 'active');
    
    if (gameState.sonFirstCompleted.length === needSon.length) {
      gameState.phase = 'play';
    }
  }

  // Create Son - SORT KARTU ASCENDING & POSITION JOKER DI GAPS
  // Separate jokers dan non-jokers
  const nonJokers = cards.filter(c => !c.isJoker).sort((a, b) => {
    const valA = getCardValue(a.rank);
    const valB = getCardValue(b.rank);
    return valA - valB;
  });
  
  const jokers = cards.filter(c => c.isJoker);
  
  // Build son cards dengan Joker di gap jika ada
  let sortedCards = [];
  
  if (jokers.length === 0) {
    // No Joker, just append non-jokers
    sortedCards = nonJokers;
  } else {
    // Ada Joker - try to position di gaps
    sortedCards = [...nonJokers];
    
    // Find gaps dan insert Jokers
    for (let i = 0; i < jokers.length; i++) {
      let inserted = false;
      
      // Try insert Joker di setiap gap
      for (let j = 0; j < sortedCards.length - 1; j++) {
        const valCurrent = getCardValue(sortedCards[j].rank);
        const valNext = getCardValue(sortedCards[j + 1].rank);
        
        // Check if there's a gap (difference > 1)
        if (valNext - valCurrent > 1) {
          // Insert Joker di gap ini
          sortedCards.splice(j + 1, 0, jokers[i]);
          inserted = true;
          break;
        }
      }
      
      // Jika tidak ada gap, append di akhir
      if (!inserted) {
        sortedCards.push(jokers[i]);
      }
    }
  }

  const newSon = {
    id: `son_${Date.now()}`,
    cards: sortedCards,
    playerId: player.id
  };

  gameState.meja.sons.push(newSon);

  // Remove cards dari hand (reverse order agar index tidak berubah)
  const sortedIndices = [...cardIndices].sort((a, b) => b - a);
  for (const idx of sortedIndices) {
    player.hand.splice(idx, 1);
  }

  // Record move
  gameState.history.push({
    playerIdx,
    action: 'new_son',
    sonId: newSon.id,
    cardCount: cards.length,
    timestamp: Date.now()
  });

  // Check CATE
  if (player.hand.length === 0) {
    return handleCate(gameState, playerIdx);
  }

  // Next turn
  gameState.currentTurnIdx = (gameState.currentTurnIdx + 1) % gameState.players.length;

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

  // Extract cards
  const cards = cardIndices.map(idx => player.hand[idx]).filter(c => c);
  
  // Minimum cards validation - stricter di first_son phase
  const minCards = gameState.phase === 'first_son' ? 5 : 3;
  if (cards.length < minCards) {
    return { success: false, reason: `Butuh minimal ${minCards} kartu untuk BOX` };
  }

  // Validasi
  if (!isValidBox(cards, gameState.phase === 'first_son').valid) {
    return { success: false, reason: 'Tidak membentuk Box yang valid' };
  }

  // Create Box
  const newBox = {
    id: `box_${Date.now()}`,
    cards,
    playerId: player.id
  };

  gameState.meja.boxes.push(newBox);

  // Remove cards dari hand
  const sortedIndices = [...cardIndices].sort((a, b) => b - a);
  for (const idx of sortedIndices) {
    player.hand.splice(idx, 1);
  }

  // Record move
  gameState.history.push({
    playerIdx,
    action: 'new_box',
    boxId: newBox.id,
    cardCount: cards.length,
    timestamp: Date.now()
  });

  // Check CATE
  if (player.hand.length === 0) {
    return handleCate(gameState, playerIdx);
  }

  // Next turn
  gameState.currentTurnIdx = (gameState.currentTurnIdx + 1) % gameState.players.length;

  return { success: true, gameState };
}

/**
 * Pemain extend SON yang sudah ada (sambung kartu)
 * @param {Object} gameState
 * @param {number} playerIdx
 * @param {number|Array} cardIdx atau cardIndices (1-2 kartu)
 * @param {number} sonIdx
 * @param {string} position 'left' atau 'right'
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
  if (!son) {
    return { success: false, reason: 'SON tidak ditemukan' };
  }

  // Check Son sudah penuh (13 kartu)
  if (son.cards.length >= 13) {
    return { success: false, reason: 'SON sudah penuh (13 kartu max)' };
  }

  // Handle both single card (cardIdx: number) and multiple cards (cardIdx: array)
  let cardIndices = Array.isArray(cardIdx) ? cardIdx : [cardIdx];
  
  // Get cards
  const cards = cardIndices.map(idx => player.hand[idx]).filter(c => c !== undefined);
  if (cards.length === 0) {
    return { success: false, reason: 'Kartu tidak ditemukan' };
  }

  if (cards.length > 2) {
    return { success: false, reason: 'Extend hanya boleh 1-2 kartu' };
  }

  // Validasi dengan strict rules
  const validation = canExtendSonMultiple(son.cards, cards, position);
  if (!validation.valid) {
    return { success: false, reason: validation.reason };
  }

  // Update Son
  if (position === 'left') {
    // Sort cards ascending sebelum prepend agar urutan benar (4-5-6-7-8-9, bukan 5-4-6-7-8-9)
    const sortedCards = [...cards].sort((a, b) => getCardValue(a.rank) - getCardValue(b.rank));
    son.cards = [...sortedCards, ...son.cards];
  } else {
    // Extend ke kanan juga perlu sort ascending (agar konsisten)
    const sortedCards = [...cards].sort((a, b) => getCardValue(a.rank) - getCardValue(b.rank));
    son.cards = [...son.cards, ...sortedCards];
  }

  // Remove kartu dari hand (sort descending agar index tidak berubah saat remove)
  const sortedIndices = [...cardIndices].sort((a, b) => b - a);
  for (const idx of sortedIndices) {
    player.hand.splice(idx, 1);
  }

  // Record move
  gameState.history.push({
    playerIdx,
    action: 'extend_son',
    sonIdx,
    position,
    cardCount: cards.length,
    timestamp: Date.now()
  });

  // Check CATE
  if (player.hand.length === 0) {
    return handleCate(gameState, playerIdx);
  }

  // Next turn
  gameState.currentTurnIdx = (gameState.currentTurnIdx + 1) % gameState.players.length;

  return { success: true, gameState };
}

/**
 * Pemain add kartu ke BOX yang sudah ada
 */
export function addToBox(gameState, playerIdx, cardIdx, boxIdx) {
  const player = gameState.players[playerIdx];
  if (!player || player.status !== 'active') {
    return { success: false, reason: 'Pemain tidak aktif' };
  }

  if (gameState.currentTurnIdx !== playerIdx) {
    return { success: false, reason: 'Bukan giliran pemain ini' };
  }

  const card = player.hand[cardIdx];
  if (!card) {
    return { success: false, reason: 'Kartu tidak ditemukan' };
  }

  const box = gameState.meja.boxes[boxIdx];
  if (!box) {
    return { success: false, reason: 'BOX tidak ditemukan' };
  }

  // Validasi: kartu harus same rank atau joker
  const boxRank = box.cards[0]?.rank;
  if (card.rank !== boxRank && !card.isJoker) {
    return { success: false, reason: `Kartu harus rank ${boxRank}` };
  }

  // Max 8 kartu per BOX
  if (box.cards.length >= 8) {
    return { success: false, reason: 'BOX sudah penuh (8 kartu max)' };
  }

  // Add kartu ke BOX
  box.cards.push(card);

  // Remove kartu dari hand
  player.hand.splice(cardIdx, 1);

  // Record move
  gameState.history.push({
    playerIdx,
    action: 'add_to_box',
    boxIdx,
    timestamp: Date.now()
  });

  // Check CATE
  if (player.hand.length === 0) {
    return handleCate(gameState, playerIdx);
  }

  // Next turn
  gameState.currentTurnIdx = (gameState.currentTurnIdx + 1) % gameState.players.length;

  return { success: true, gameState };
}

/**
 * Pemain pass (tidak bisa main lagi di round ini)
 * Calculate sisa kartu mereka dan mark as 'passed'
 */
export function playerPass(gameState, playerIdx) {
  const player = gameState.players[playerIdx];
  if (!player || player.status !== 'active') {
    return { success: false, reason: 'Pemain tidak aktif' };
  }

  if (gameState.currentTurnIdx !== playerIdx) {
    return { success: false, reason: 'Bukan giliran pemain ini' };
  }

  // Calculate sisa kartu score
  player.score = calculateRemainingScore(player.hand);
  
  // Mark player sebagai passed (keluar dari round ini)
  player.status = 'passed';

  gameState.history.push({
    playerIdx,
    action: 'pass',
    score: player.score,
    timestamp: Date.now()
  });

  // Check apakah semua pemain sudah pass atau cate
  const stillActive = gameState.players.filter(p => p.status === 'active').length;
  
  if (stillActive === 0) {
    // Semua pemain sudah pass → round end
    // Calculate scores untuk semua pemain yang belum dihitung
    gameState.players.forEach(p => {
      if (p.status !== 'cate' && p.status !== 'cate_tangan' && p.score === 0) {
        p.score = calculateRemainingScore(p.hand);
      }
    });
    gameState.phase = 'round_end';
    return { success: true, gameState, roundEnd: true };
  }

  // Next turn - skip pemain yang passed
  let nextIdx = (gameState.currentTurnIdx + 1) % gameState.players.length;
  let attempts = 0;
  const maxAttempts = gameState.players.length;
  
  while (gameState.players[nextIdx].status !== 'active' && attempts < maxAttempts) {
    nextIdx = (nextIdx + 1) % gameState.players.length;
    attempts++;
  }

  gameState.currentTurnIdx = nextIdx;

  return { success: true, gameState };
}

/**
 * Handle CATE (pemain kartu habis)
 */
function handleCate(gameState, playerIdx) {
  const player = gameState.players[playerIdx];
  
  player.status = 'cate';
  gameState.cateType = 'normal';

  // Calculate CATE score: cek joker terakhir yang dipakai
  let jokerBonus = 0;
  
  // Lihat history untuk find last card yang di-play (harus joker atau bukan)
  const lastMove = gameState.history[gameState.history.length - 1];
  
  // Cek apakah ada joker di meja sekarang (dari Son atau Box terakhir)
  const allTableCards = [
    ...gameState.meja.sons.flatMap(s => s.cards),
    ...gameState.meja.boxes.flatMap(b => b.cards)
  ];
  
  // Count joker yang dimainkan oleh player yang CATE
  const playerJokers = allTableCards.filter(c => c.isJoker).length;
  // This is simplified - ideally track per player. For MVP, assume all jokers on table could be theirs
  // Better: track in history which player played which card
  
  // For now: base CATE bonus + check last played card
  let score = 50; // Base CATE bonus
  
  // TODO: Implement proper joker tracking per player
  // Score += jokerBonus * 100 (jika ada joker di kartu terakhir)
  
  player.score = score;

  // Hitung minus untuk pemain lain yang masih active
  gameState.players.forEach((p, idx) => {
    if (p.status === 'active') {
      let minusTotal = 0;
      
      // Sum semua kartu sisa
      p.hand.forEach(card => {
        minusTotal += getMinusValue(card.rank);
      });
      
      // Joker penalty: -100 per joker
      const jokerPenalty = p.hand.filter(c => c.isJoker).length * 100;
      
      p.score = -(minusTotal + jokerPenalty);
    }
  });

  gameState.phase = 'round_end';

  return { success: true, gameState, roundEnd: true };
}

/**
 * Declare player gagal Son pertama
 * Rules:
 * - 4 pemain: 1 gagal → restart, 2+ gagal → restart
 * - 5 pemain: 1 gagal → lanjut (-50), 2+ gagal → restart
 * Return: {restart: boolean} - true jika perlu restart
 */
export function declareFailFirstSon(gameState, playerIdx) {
  const player = gameState.players[playerIdx];
  if (!player || player.status !== 'active') {
    return { success: false, reason: 'Pemain tidak aktif' };
  }

  if (gameState.currentTurnIdx !== playerIdx) {
    return { success: false, reason: 'Bukan giliran pemain ini' };
  }

  // Hitung fail sebelum tambah (untuk determine logic)
  const prevFailCount = gameState.players.filter(p => p.status === 'son_failed').length;
  const playerCount = gameState.players.length;

  // Tentukan apakah akan restart SEBELUM mutate state
  let willRestart = false;
  if (playerCount === 4) {
    // 4 pemain: ANY fail → restart
    willRestart = true;
  } else if (playerCount === 5) {
    // 5 pemain: 2+ fail → restart
    willRestart = (prevFailCount + 1) >= 2;
  }

  if (willRestart) {
    // RESTART: jangan mutate apapun, langsung return restart signal
    // State akan di-reset di reducer dengan initializeGame()
    gameState.history.push({
      playerIdx,
      action: 'declare_fail_son',
      failCount: prevFailCount + 1,
      note: 'restart',
      timestamp: Date.now()
    });
    return { success: true, restart: true };
  } else {
    // CONTINUE: mutate state - mark pemain gagal dengan poin -50
    player.status = 'son_failed';
    player.score = -50;

    gameState.history.push({
      playerIdx,
      action: 'declare_fail_son',
      failCount: prevFailCount + 1,
      score: -50,
      timestamp: Date.now()
    });

    // Skip pemain ini, lanjut ke next active player
    let nextIdx = (gameState.currentTurnIdx + 1) % gameState.players.length;
    let attempts = 0;
    const maxAttempts = gameState.players.length;
    
    while (gameState.players[nextIdx].status !== 'active' && attempts < maxAttempts) {
      nextIdx = (nextIdx + 1) % gameState.players.length;
      attempts++;
    }
    
    gameState.currentTurnIdx = nextIdx;
    return { success: true, restart: false, gameState };
  }
}

/**
 * Get round scores untuk save ke Supabase
 */
export function getRoundScores(gameState, roundNumber) {
  const scores = gameState.players.map(player => ({
    player_id: player.id,
    is_cate: player.status === 'cate',
    son_failed: player.status === 'son_failed',
    card_score: player.status === 'active' ? 0 : calculateCardScore(player.hand),
    round_total: player.score,
    score_reset: false // TODO: Implement auto-reset logic
  }));

  return scores;
}

/**
 * Helper: calculate card score untuk pemain yang tidak CATE
 */
function calculateCardScore(hand) {
  return hand.reduce((sum, card) => sum + getMinusValue(card.rank), 0);
}

/**
 * Next Round - Lanjut ke ronde berikutnya
 * Reset status, shuffle deck baru, deal kartu
 */
export function nextRound(gameState) {
  if (gameState.phase !== 'round_end') {
    return { success: false, reason: 'Game harus dalam phase round_end' };
  }

  // STEP 1: Accumulate round scores ke totalScore sebelum reset
  gameState.players.forEach((player) => {
    if (!player.totalScore) player.totalScore = 0;
    player.totalScore += player.score; // Add current round score
  });

  // Shuffle & deal kartu baru
  const deck = createDeck();
  const shuffled = shuffleDeck(deck);
  const playerCount = gameState.players.length;
  const { playerCards, remaining } = dealCards(shuffled, playerCount);

  // Check Cate Tangan untuk setiap pemain di ronde baru
  const cateTanganPlayers = [];
  gameState.players.forEach((player, idx) => {
    if (checkCateTangan(playerCards[idx])) {
      cateTanganPlayers.push({
        playerId: player.id,
        score: 50
      });
    }
  });

  // Update pemain status dan hand untuk ronde baru
  gameState.players.forEach((player, idx) => {
    player.hand = playerCards[idx] || [];
    player.score = 0; // Reset score untuk ronde ini
    
    // Set status berdasarkan Cate Tangan
    if (cateTanganPlayers.some(p => p.playerId === player.id)) {
      player.status = 'cate_tangan';
      player.score = 50;
    } else {
      player.status = 'active';
    }
  });

  // STEP 2: Find pemain dengan TOTAL SCORE tertinggi untuk giliran pertama di ronde baru
  let highestScoreIdx = 0;
  let highestScore = gameState.players[0].totalScore;
  
  gameState.players.forEach((player, idx) => {
    if (player.totalScore > highestScore) {
      highestScore = player.totalScore;
      highestScoreIdx = idx;
    }
  });
  
  // Reset state untuk ronde berikutnya
  gameState.round += 1;
  gameState.currentTurnIdx = highestScoreIdx; // Pemain dengan total score tertinggi mulai ronde berikutnya
  gameState.phase = 'first_son';
  gameState.deck = remaining;
  gameState.meja = {
    sons: [],
    boxes: []
  };
  gameState.cateType = cateTanganPlayers.length > 0 ? 'tangan' : null;
  gameState.sonFirstCompleted = [];
  gameState.history = []; // Clear history untuk ronde berikutnya (atau bisa dipreserve jika ingin record lengkap)

  return { success: true, gameState };
}

