import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { GameProvider, useGameContext } from '../context/GameContext';
import { TurnIndicator } from '../components/GamePlay/TurnIndicator';
import { CardHand } from '../components/GamePlay/CardHand';
import { CardTable } from '../components/GamePlay/CardTable';
import { getValidMoves, canExtendSunMultiple, isValidBox } from '../engine/cardValidator';

/**
 * PlayGame - Halaman utama game
 */
export function PlayGame() {
  const location = useLocation();
  const setupData = location.state || {};

  return (
    <GameProvider initialPlayers={setupData.players || []} minusLimit={setupData.minusLimit || -300}>
      <PlayGameContent setupData={setupData} />
    </GameProvider>
  );
}

/**
 * PlayGameContent - Main game UI dengan integrated GameContext
 */
function PlayGameContent({ setupData }) {
  const {
    gameState,
    playNewSun,
    playNewBox,
    extendSun,
    addToBox,
    playerPass,
    declareFailFirstSun,
    nextRound
  } = useGameContext();

  const [selectedCards, setSelectedCards] = useState([]);
  const [action, setAction] = useState(null); // 'sun', 'box', 'extend', 'add_box'
  const [targetIndex, setTargetIndex] = useState(null); // target Sun/Box index untuk extend/add
  const [restartMessage, setRestartMessage] = useState(null); // Show restart notification
  const [passMessage, setPassMessage] = useState(false); // Show pass confirmation briefly before advancing turn
  const [validMoves, setValidMoves] = useState([]); // Valid moves untuk current player
  const [validCardIndices, setValidCardIndices] = useState([]); // Card indices yang bisa dipakai (extend/add)
  const [validSunIndices, setValidSunIndices] = useState([]); // Sun indices yang bisa di-extend
  const [validBoxIndices, setValidBoxIndices] = useState([]); // Box indices yang bisa di-add
  const [sunCreationCards, setSunCreationCards] = useState([]); // Kartu yang bisa bikin SUN
  const [boxCreationCards, setBoxCreationCards] = useState([]); // Kartu yang bisa bikin BOX
  const [extendableSuns, setExtendableSuns] = useState([]); // Sun yang bisa di-extend dengan selected cards
  const [lastPhase, setLastPhase] = useState(null); // Track phase perubahan untuk detect restart
  const [extendableCardsDefault, setExtendableCardsDefault] = useState([]); // Default kartu yang bisa extend ANY sun
  const [addableCardsDefault, setAddableCardsDefault] = useState([]); // Default kartu yang bisa add ANY box
  const navigate = useNavigate();

  // Helper: compute kartu yang bisa bikin SUN (3+ berurutan same suit)
  const computeValidSunCards = (hand) => {
    const bySuit = { '♠': [], '♥': [], '♦': [], '♣': [] };
    hand.forEach((card, idx) => {
      if (!card.isJoker) {
        bySuit[card.suit].push({ idx, value: card.value });
      }
    });
    
    const validCards = new Set();
    
    // Untuk setiap suit, cari sequences berurutan 3+ kartu
    Object.values(bySuit).forEach(cards => {
      if (cards.length < 3) return;
      
      // Sort by value
      const sorted = [...cards].sort((a, b) => a.value - b.value);
      
      // Find consecutive sequences
      let seqStart = 0;
      for (let i = 1; i <= sorted.length; i++) {
        const isLast = i === sorted.length;
        const isConsecutive = !isLast && sorted[i].value === sorted[i - 1].value + 1;
        
        if (!isConsecutive) {
          // End of sequence
          const seqLength = i - seqStart;
          if (seqLength >= 3) {
            // Valid sequence, add all indices
            for (let j = seqStart; j < i; j++) {
              validCards.add(sorted[j].idx);
            }
          }
          seqStart = i;
        }
      }
    });
    
    return Array.from(validCards);
  };

  // Helper: compute kartu yang bisa bikin BOX (3+ same rank)
  const computeValidBoxCards = (hand, minCards = 3) => {
    const byRank = {};
    hand.forEach((card, idx) => {
      if (!card.isJoker) {
        if (!byRank[card.rank]) byRank[card.rank] = [];
        byRank[card.rank].push(idx);
      }
    });
    
    const validCards = new Set();
    Object.values(byRank).forEach(indices => {
      if (indices.length >= minCards) {
        indices.forEach(idx => validCards.add(idx));
      }
    });
    
    return Array.from(validCards);
  };

  // Detect restart saat fase berubah kembali ke first_sun (indication of game reset)
  useEffect(() => {
    if (gameState?.phase === 'first_sun' && lastPhase === 'first_sun' && restartMessage) {
      // Restart selesai, bersihkan message setelah 2 detik
      const timer = setTimeout(() => {
        setRestartMessage(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
    setLastPhase(gameState?.phase);
  }, [gameState?.phase, restartMessage]);

  // Auto-clear pass message after 2 seconds
  useEffect(() => {
    if (passMessage) {
      const timer = setTimeout(() => {
        setPassMessage(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [passMessage]);

  // Calculate valid moves & default visual indicators
  useEffect(() => {
    if (!gameState || !currentPlayer) return;
    
    const moves = getValidMoves(currentPlayer.hand, gameState.meja.suns, gameState.meja.boxes);
    setValidMoves(moves);
    
    // Compute visual indicators untuk moves
    const validCards = new Set();
    const validSuns = new Set();
    const validBoxes = new Set();
    
    moves.forEach(move => {
      if (move.cardIdx !== undefined) {
        validCards.add(move.cardIdx);
      }
      if (move.sunIdx !== undefined) {
        validSuns.add(move.sunIdx);
      }
      if (move.boxIdx !== undefined) {
        validBoxes.add(move.boxIdx);
      }
    });
    
    setValidCardIndices(Array.from(validCards));
    setValidSunIndices(Array.from(validSuns));
    setValidBoxIndices(Array.from(validBoxes));
    
    // Compute SUN creation cards
    const sunCards = computeValidSunCards(currentPlayer.hand);
    setSunCreationCards(sunCards);
    
    // Compute BOX creation cards (3+ untuk normal, 5+ untuk first_sun)
    const minBoxCards = isFirstSunPhase ? 5 : 3;
    const boxCards = computeValidBoxCards(currentPlayer.hand, minBoxCards);
    setBoxCreationCards(boxCards);
    
    // Compute DEFAULT extendable cards - kartu yang bisa extend ANY sun
    const extendableSet = new Set();
    currentPlayer.hand.forEach((card, cardIdx) => {
      if (!card.isJoker) {
        gameState.meja.suns.forEach(sun => {
          if (canExtendSunMultiple(sun.cards, [card], 'left').valid ||
              canExtendSunMultiple(sun.cards, [card], 'right').valid) {
            extendableSet.add(cardIdx);
          }
        });
      }
    });
    setExtendableCardsDefault(Array.from(extendableSet));
    
    // Compute DEFAULT addable cards - kartu yang bisa add ANY box
    const addableSet = new Set();
    currentPlayer.hand.forEach((card, cardIdx) => {
      gameState.meja.boxes.forEach(box => {
        const testBox = [...box.cards, card];
        if (isValidBox(testBox).valid) {
          addableSet.add(cardIdx);
        }
      });
    });
    setAddableCardsDefault(Array.from(addableSet));
    
    // Compute extendable SUNs dengan selected cards
    if (action === 'extend' && selectedCards.length > 0) {
      const extendCards = selectedCards.map(idx => currentPlayer.hand[idx]);
      const extendable = new Set();
      
      gameState.meja.suns.forEach((sun, sunIdx) => {
        const leftValid = canExtendSunMultiple(sun.cards, extendCards, 'left').valid;
        const rightValid = canExtendSunMultiple(sun.cards, extendCards, 'right').valid;
        if (leftValid || rightValid) {
          extendable.add(sunIdx);
        }
      });
      
      setExtendableSuns(Array.from(extendable));
    } else {
      setExtendableSuns([]);
    }
  }, [gameState?.currentTurnIdx, gameState?.meja, gameState?.phase, action, selectedCards]);

  if (!gameState) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-2xl font-bold mb-4">Loading game...</div>
          <div className="animate-spin text-4xl">🃏</div>
        </div>
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.currentTurnIdx];
  const playerHand = currentPlayer?.hand || [];
  const isFirstSunPhase = gameState.phase === 'first_sun';
  const failedSunCount = gameState.players.filter(p => p.status === 'sun_failed').length;
  const playerCount = gameState.players.length;

  // Handle card selection
  const handleCardClick = (cardIdx) => {
    // Prevent card selection if player already passed
    if (currentPlayer?.status !== 'active') {
      return;
    }
    if (selectedCards.includes(cardIdx)) {
      setSelectedCards(selectedCards.filter(i => i !== cardIdx));
    } else {
      setSelectedCards([...selectedCards, cardIdx]);
    }
  };

  // Handle create SUN
  const handleCreateSun = () => {
    if (selectedCards.length < 3) {
      alert('Butuh minimal 3 kartu untuk SUN');
      return;
    }
    playNewSun(gameState.currentTurnIdx, selectedCards);
    setSelectedCards([]);
    setAction(null);
  };

  // Handle create BOX
  const handleCreateBox = () => {
    const minCards = isFirstSunPhase ? 5 : 3;
    if (selectedCards.length < minCards) {
      alert(`Butuh minimal ${minCards} kartu untuk BOX`);
      return;
    }
    playNewBox(gameState.currentTurnIdx, selectedCards);
    setSelectedCards([]);
    setAction(null);
  };

  // Handle extend SUN
  const handleExtendSun = (sunIdx, position) => {
    if (selectedCards.length < 1 || selectedCards.length > 2) {
      alert('Pilih 1-2 kartu untuk sambung ke SUN');
      return;
    }
    // Pass array of cardIndices for extendSun
    extendSun(gameState.currentTurnIdx, selectedCards, sunIdx, position);
    setSelectedCards([]);
    setAction(null);
    setTargetIndex(null);
  };

  // Handle add to BOX
  const handleAddToBox = (boxIdx) => {
    if (selectedCards.length !== 1) {
      alert('Pilih 1 kartu untuk tambah ke BOX');
      return;
    }
    addToBox(gameState.currentTurnIdx, selectedCards[0], boxIdx);
    setSelectedCards([]);
    setAction(null);
    setTargetIndex(null);
  };

  // Handle pass - check apakah benar pemain tidak punya valid moves
  const handlePass = () => {
    // Always allow pass - user decides when they can't play
    const totalMinusValue = currentPlayer.hand.reduce((sum, card) => {
      return sum + (card.isJoker ? 100 : (card.rank === 'A' ? 15 : 
                     (card.rank === 'J' || card.rank === 'Q' || card.rank === 'K' ? 10 : 
                     parseInt(card.rank) || 0)));
    }, 0);
    
    playerPass(gameState.currentTurnIdx);
    
    // Show pass message briefly
    setPassMessage(true);
    setTimeout(() => {
      setPassMessage(false);
    }, 2000);
    
    setSelectedCards([]);
    setAction(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4">
      {/* ROUND END SCREEN */}
      {gameState.phase === 'round_end' && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-gradient-to-b from-yellow-900 to-yellow-800 p-8 rounded-lg border-4 border-yellow-400 text-center">
            <div className="text-4xl font-bold text-yellow-200 mb-4">🏆 RONDE SELESAI!</div>
            
            <div className="bg-slate-800 p-6 rounded-lg mb-6 border border-yellow-400">
              <h3 className="text-yellow-300 font-bold text-lg mb-4">📊 HASIL RONDE {gameState.round}</h3>
              
              <div className="space-y-3">
                {gameState.players.map((player, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-700 p-3 rounded border-l-4"
                    style={{
                      borderLeftColor: ['purple', 'red', 'green', 'orange', 'blue'][idx % 5]
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <div className="text-left">
                        <div className="font-bold text-white">{idx + 1}. {player.name}</div>
                        <div className="text-xs text-slate-400 mt-1">
                          Status: <span className={`font-semibold ${
                            player.status === 'cate' ? 'text-green-400' :
                            player.status === 'cate_tangan' ? 'text-blue-400' :
                            'text-red-400'
                          }`}>
                            {player.status === 'cate' ? '✓ CATE' : 
                             player.status === 'cate_tangan' ? '✓ CATE TANGAN' : '❌ PASSED'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold" style={{
                          color: player.score > 0 ? '#4ade80' : '#f87171'
                        }}>
                          {player.score > 0 ? '+' : ''}{player.score}
                        </div>
                        <div className="text-xs text-slate-400">poin</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <button
              onClick={() => {
                // Lanjut ke ronde berikutnya
                nextRound();
              }}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg text-lg mb-2"
            >
              ▶ Ronde Berikutnya
            </button>
            
            <button
              onClick={() => navigate('/')}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded-lg"
            >
              🏠 Kembali ke Lobby
            </button>
          </div>
        </div>
      )}

      {/* NORMAL GAME SCREEN */}
      {gameState.phase !== 'round_end' && (
        <>
      {/* Restart Message */}
      {restartMessage && (
        <div className="mb-4 p-4 bg-red-900 border-2 border-red-500 text-red-100 rounded font-bold text-center animate-pulse">
          {restartMessage}
        </div>
      )}

      {/* Pass Notification - non-blocking, just shows briefly at top */}
      {passMessage && (
        <div className="mb-4 p-3 bg-blue-900 border-2 border-blue-400 text-blue-100 rounded font-bold text-center animate-pulse">
          ✓ PAS - Giliran dilanjutkan ke pemain berikutnya...
        </div>
      )}
      
      {/* Header */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-center">
        <div className="bg-slate-800 p-3 rounded border-l-4 border-purple-500">
          <div className="text-xs text-slate-400">Ronde</div>
          <div className="text-2xl font-bold text-white">{gameState.round}</div>
        </div>
        <div className="bg-slate-800 p-3 rounded border-l-4 border-blue-500">
          <div className="text-xs text-slate-400">Fase</div>
          <div className="text-sm font-bold text-white">
            {gameState.phase === 'first_sun' ? '🎴 Sun Pertama' : '🎮 Main'}
          </div>
        </div>
        <div className="bg-slate-800 p-3 rounded border-l-4 border-green-500">
          <div className="text-xs text-slate-400">Pemain</div>
          <div className="text-sm font-bold text-green-300">{gameState.players.filter(p => p.status === 'active').length} Active</div>
        </div>
      </div>

      {/* First SUN Warning */}
      {isFirstSunPhase && (
        <div className="bg-yellow-900 border-2 border-yellow-500 text-yellow-100 p-3 rounded mb-4 font-semibold">
          ⚠️ Fase Sun Pertama: Pemain WAJIB keluarkan SUN (3+ kartu simbol sama berurutan)
        </div>
      )}

      {/* Turn Indicator */}
      <TurnIndicator gameState={gameState} />

      {/* Players Status Indicator */}
      <div className="bg-slate-800 p-3 rounded border-2 border-slate-600 mb-4">
        <h4 className="text-slate-300 text-xs font-semibold mb-2">👥 STATUS PEMAIN</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {gameState.players.map((player, idx) => (
            <div
              key={idx}
              className={`p-2 rounded text-xs font-semibold text-center border-2 transition-all ${
                gameState.currentTurnIdx === idx
                  ? 'bg-purple-600 border-purple-400 text-white scale-105'
                  : player.status === 'passed'
                  ? 'bg-slate-700 border-red-500 text-red-300'
                  : player.status === 'cate'
                  ? 'bg-green-700 border-green-400 text-green-200'
                  : player.status === 'cate_tangan'
                  ? 'bg-blue-700 border-blue-400 text-blue-200'
                  : 'bg-slate-700 border-slate-500 text-slate-300'
              }`}
            >
              <div className="font-bold">{player.name}</div>
              <div className="text-xs mt-1">
                {gameState.currentTurnIdx === idx
                  ? '🎯 Giliran'
                  : player.status === 'passed'
                  ? '❌ Passed'
                  : player.status === 'cate'
                  ? '✓ CATE'
                  : player.status === 'cate_tangan'
                  ? '✓ CATE TANGAN'
                  : '🆗 Active'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Card Table / Meja */}
      <div className="bg-gradient-to-b from-green-900 to-green-800 p-4 rounded-lg min-h-48 border-2 border-green-600 overflow-x-auto mb-4">
        <h3 className="text-white font-bold mb-4">📋 MEJA</h3>

        {/* SUN */}
        {gameState.meja.suns.length > 0 && (
          <div className="mb-4">
            <h4 className="text-yellow-300 text-sm font-semibold mb-2">🎴 SUN ({gameState.meja.suns.length})</h4>
            <div className="flex gap-3 flex-wrap">
              {gameState.meja.suns.map((sun, sunIdx) => (
                <button
                  key={sun.id}
                  onClick={() => {
                    if (action === 'extend' && targetIndex === sunIdx) {
                      setAction(null);
                      setTargetIndex(null);
                    } else {
                      setAction('extend');
                      setTargetIndex(sunIdx);
                    }
                  }}
                  className={`bg-slate-800 p-2 rounded border-2 transition-all ${
                    action === 'extend' && targetIndex === sunIdx
                      ? 'border-purple-400 bg-purple-900'
                      : (action === 'extend' && selectedCards.length > 0 ? extendableSuns.includes(sunIdx) : validSunIndices.includes(sunIdx))
                      ? 'border-green-400 hover:border-green-300 shadow-lg shadow-green-500/50'
                      : 'border-yellow-500 hover:border-yellow-300'
                  }`}
                >
                  <div className="flex gap-1 mb-1">
                    {sun.cards.map((card, idx) => (
                      <div
                        key={`${sun.id}-${idx}`}
                        className="w-12 h-14 bg-white rounded text-center text-xs font-bold flex flex-col items-center justify-center border border-gray-300"
                      >
                        {card.label === 'JOKER' ? (
                          <span className="text-2xl">🃏</span>
                        ) : (
                          <>
                            <span className={card.suit === '♥' || card.suit === '♦' ? 'text-red-600' : 'text-black'}>
                              {card.suit}
                            </span>
                            <span className={card.suit === '♥' || card.suit === '♦' ? 'text-red-600' : 'text-black'}>
                              {card.label}
                            </span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-gray-300">{sun.cards.length}/13 kartu</div>
                </button>
              ))}
            </div>

            {/* Extend SUN Options */}
            {action === 'extend' && targetIndex !== null && selectedCards.length >= 1 && selectedCards.length <= 2 && (
              <div className="mt-3 p-3 bg-purple-900 rounded border border-purple-400">
                <p className="text-purple-100 text-sm mb-2">
                  Sambung {selectedCards.length} kartu ke mana?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleExtendSun(targetIndex, 'left')}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-semibold text-sm"
                  >
                    ← Kiri
                  </button>
                  <button
                    onClick={() => handleExtendSun(targetIndex, 'right')}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-semibold text-sm"
                  >
                    Kanan →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* BOX */}
        {gameState.meja.boxes.length > 0 && (
          <div>
            <h4 className="text-blue-300 text-sm font-semibold mb-2">📦 BOX ({gameState.meja.boxes.length})</h4>
            <div className="flex gap-3 flex-wrap">
              {gameState.meja.boxes.map((box, boxIdx) => (
                <button
                  key={box.id}
                  onClick={() => {
                    if (action === 'add_box' && targetIndex === boxIdx) {
                      setAction(null);
                      setTargetIndex(null);
                    } else {
                      setAction('add_box');
                      setTargetIndex(boxIdx);
                    }
                  }}
                  className={`bg-slate-800 p-2 rounded border-2 transition-all ${
                    action === 'add_box' && targetIndex === boxIdx
                      ? 'border-purple-400 bg-purple-900'
                      : validBoxIndices.includes(boxIdx)
                      ? 'border-green-400 hover:border-green-300 shadow-lg shadow-green-500/50'
                      : 'border-blue-500 hover:border-blue-300'
                  }`}
                >
                  <div className="flex gap-1 mb-1">
                    {box.cards.map((card, idx) => (
                      <div
                        key={`${box.id}-${idx}`}
                        className="w-12 h-14 bg-white rounded text-center text-xs font-bold flex flex-col items-center justify-center border border-gray-300"
                      >
                        {card.label === 'JOKER' ? (
                          <span className="text-2xl">🃏</span>
                        ) : (
                          <>
                            <span className={card.suit === '♥' || card.suit === '♦' ? 'text-red-600' : 'text-black'}>
                              {card.suit}
                            </span>
                            <span className={card.suit === '♥' || card.suit === '♦' ? 'text-red-600' : 'text-black'}>
                              {card.label}
                            </span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-gray-300">{box.cards[0]?.label} × {box.cards.length}</div>
                </button>
              ))}
            </div>

            {/* Add to BOX Option */}
            {action === 'add_box' && targetIndex !== null && selectedCards.length === 1 && (
              <div className="mt-3 p-3 bg-purple-900 rounded border border-purple-400">
                <button
                  onClick={() => handleAddToBox(targetIndex)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded font-semibold"
                >
                  ✓ Tambah ke BOX
                </button>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {gameState.meja.suns.length === 0 && gameState.meja.boxes.length === 0 && (
          <div className="flex items-center justify-center h-20 text-gray-400">
            Meja kosong - {isFirstSunPhase ? 'wajib buat SUN pertama' : 'buat SUN atau BOX'}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="h-1 bg-purple-500/30 my-4 rounded"></div>

      {/* Card Hand - Driven by gameState, not passMessage */}
      {currentPlayer?.status === 'active' ? (
      <CardHand
        hand={playerHand}
        onCardSelect={handleCardClick}
        selectedIndices={selectedCards}
        validIndices={
          action === 'sun' ? sunCreationCards :
          action === 'box' ? boxCreationCards :
          // Default: HANYA highlight jika ada valid action
          (() => {
            if (isFirstSunPhase) {
              return sunCreationCards;
            }
            
            // Play phase: combine hanya yang bisa create/extend/add
            const validCards = new Set();
            
            // Always add kartu yang bisa create SUN/BOX
            sunCreationCards.forEach(idx => validCards.add(idx));
            boxCreationCards.forEach(idx => validCards.add(idx));
            
            // Only add extend/add jika ada SUN/BOX di meja
            if (gameState.meja.suns.length > 0) {
              extendableCardsDefault.forEach(idx => validCards.add(idx));
            }
            if (gameState.meja.boxes.length > 0) {
              addableCardsDefault.forEach(idx => validCards.add(idx));
            }
            
            return Array.from(validCards);
          })()
        }
      />
      ) : (
        <div className="bg-gradient-to-b from-slate-800 to-slate-900 p-6 rounded-lg border-4 border-red-500 text-center">
          <div className="text-3xl font-bold text-red-400 mb-2">⏸️ SUDAH PAS</div>
          <div className="text-red-200 font-semibold mb-2">Anda tidak akan mendapat giliran lagi di ronde ini</div>
          <div className="text-slate-400 text-sm">Mohon tunggu ronde selesai...</div>
          <div className="mt-4 flex justify-center gap-2">
            {playerHand.map((card, idx) => (
              <div
                key={idx}
                className="w-12 h-16 bg-slate-700 rounded border-2 border-slate-600 flex flex-col items-center justify-center text-xs opacity-50"
              >
                {card.isJoker ? (
                  <span className="text-xl">🃏</span>
                ) : (
                  <>
                    <span className={card.suit === '♥' || card.suit === '♦' ? 'text-red-400' : 'text-slate-300'}>
                      {card.suit}
                    </span>
                    <span className={card.suit === '♥' || card.suit === '♦' ? 'text-red-400' : 'text-slate-300'}>
                      {card.label}
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons - Only show for active players */}
      {currentPlayer?.status === 'active' ? (
      <div className="bg-slate-900 border-t border-purple-500 p-4 space-y-2 mt-4">
        {/* Info */}
        <div className="text-center text-slate-400 text-sm">
          {action === 'extend' && selectedCards.length > 0
            ? `✓ ${selectedCards.length} kartu - Ready to extend`
            : selectedCards.length > 0 
              ? `✓ ${selectedCards.length} kartu dipilih` 
              : 'Pilih kartu untuk action'}
        </div>

        {/* Main Actions */}
        <div className={`grid gap-2 ${isFirstSunPhase ? 'grid-cols-2' : 'grid-cols-3'}`}>
          <button
            onClick={() => {
              setAction(action === 'sun' ? null : 'sun');
              if (action !== 'sun') setSelectedCards([]);
            }}
            className={`py-2 rounded font-bold transition-all ${
              action === 'sun'
                ? 'bg-yellow-600 text-white'
                : 'bg-yellow-700 hover:bg-yellow-600 text-white'
            }`}
          >
            🎴 SUN
          </button>

          <button
            onClick={() => {
              setAction(action === 'box' ? null : 'box');
              if (action !== 'box') setSelectedCards([]);
            }}
            className={`py-2 rounded font-bold transition-all ${
              action === 'box'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-700 hover:bg-blue-600 text-white'
            }`}
          >
            📦 BOX {isFirstSunPhase && '(5+)'}
          </button>

          {isFirstSunPhase && (
            <button
              onClick={() => {
                const nextFailCount = failedSunCount + 1;
                
                // Determine message based on player count dan fail count
                let msg = '';
                let willRestart = false;
                
                if (playerCount === 4) {
                  // 4 pemain: ANY fail → restart, poin -0
                  willRestart = true;
                  msg = 'Gagal Sun → Ronde akan DIULANG\nPoin Anda: 0 (tidak ada pengurangan)\nKartu akan dibagikan ulang ke semua pemain';
                } else if (playerCount === 5) {
                  // 5 pemain: check fail count
                  if (nextFailCount >= 2) {
                    // 2+ fail → restart, poin -0
                    willRestart = true;
                    msg = 'Gagal Sun → Ronde akan DIULANG\nPoin Anda: 0 (tidak ada pengurangan)\nKartu akan dibagikan ulang ke semua pemain';
                  } else {
                    // 1 fail → continue, poin -50
                    willRestart = false;
                    msg = 'Gagal Sun → Anda akan keluar dari ronde ini\nPoin Anda: -50\nPermainan lanjut dengan pemain lainnya';
                  }
                }
                
                if (confirm(`Anda tidak bisa membuat SUN?\n\n${msg}\n\nTekan OK untuk lanjut.`)) {
                  declareFailFirstSun(gameState.currentTurnIdx);
                  setSelectedCards([]);
                  setAction(null);
                  
                  if (willRestart) {
                    setRestartMessage('⚠️ Ronde Diulang! Kartu akan dibagikan kembali...');
                  }
                }
              }}
              className="bg-red-700 hover:bg-red-600 text-white font-bold py-2 rounded"
            >
              ❌ Gagal Sun
            </button>
          )}

          {!isFirstSunPhase && (
            <button
              onClick={handlePass}
              className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded"
            >
              👋 Pas
            </button>
          )}
        </div>

        {/* Confirm Buttons */}
        {action === 'sun' && (
          <button
            onClick={handleCreateSun}
            disabled={selectedCards.length < 3}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white font-bold py-2 rounded"
          >
            ✓ Buat SUN ({selectedCards.length}/3+)
          </button>
        )}

        {action === 'box' && (
          <button
            onClick={handleCreateBox}
            disabled={selectedCards.length < (isFirstSunPhase ? 5 : 3)}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white font-bold py-2 rounded"
          >
            ✓ Buat BOX ({selectedCards.length}/{isFirstSunPhase ? '5+' : '3+'})
          </button>
        )}
      </div>
      ) : null}
      </>
    )}
    </div>
  );
}
