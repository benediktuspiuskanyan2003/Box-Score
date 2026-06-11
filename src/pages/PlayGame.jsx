import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { GameProvider, useGameContext } from '../context/GameContext';
import { TurnIndicator } from '../components/GamePlay/TurnIndicator';
import { CardHand } from '../components/GamePlay/CardHand';
import { CardTable } from '../components/GamePlay/CardTable';
import { getValidMoves, canExtendSonMultiple, isValidBox, detectSonJokerAmbiguity } from '../engine/cardValidator';

/**
 * PlayGame - Halaman utama game
 */
export function PlayGame() {
  const location = useLocation();
  const { roomId, myUserId } = location.state || {};

  return (
    <GameProvider roomId={roomId} myUserId={myUserId}>
      <PlayGameContent />
    </GameProvider>
  );
}

/**
 * PlayGameContent - Main game UI dengan integrated GameContext
 */
function PlayGameContent() {
  const {
    gameState,
    loadingGame,
    myPlayerIdx,
    isMyTurn,
    playNewSon,
    playNewBox,
    extendSon,
    addToBox,
    playerPass,
    declareFailFirstSon,
    nextRound
  } = useGameContext();

  const [selectedCards, setSelectedCards] = useState([]);
  const [action, setAction] = useState(null);
  const [targetIndex, setTargetIndex] = useState(null);
  const [restartMessage, setRestartMessage] = useState(null);
  const [passMessage, setPassMessage] = useState(false);
  const [validMoves, setValidMoves] = useState([]);
  const [validCardIndices, setValidCardIndices] = useState([]);
  const [validSonIndices, setValidSonIndices] = useState([]);
  const [validBoxIndices, setValidBoxIndices] = useState([]);
  const [sonCreationCards, setSonCreationCards] = useState([]);
  const [boxCreationCards, setBoxCreationCards] = useState([]);
  const [extendableSons, setExtendableSons] = useState([]);
  const [lastPhase, setLastPhase] = useState(null);
  const [extendableCardsDefault, setExtendableCardsDefault] = useState([]);
  const [addableCardsDefault, setAddableCardsDefault] = useState([]);
  // ✅ State untuk dialog pilihan posisi Joker
  const [jokerPositionChoice, setJokerPositionChoice] = useState(null);
  const navigate = useNavigate();

  const myPlayer = gameState?.players[myPlayerIdx];
  const myHand = myPlayer?.hand || [];
  const currentPlayer = gameState?.players[gameState?.currentTurnIdx];
  const isMyTurnNow = isMyTurn ? isMyTurn() : false;
  const isFirstSonPhase = gameState?.phase === 'first_son';
  const failedSonCount = gameState?.players.filter(p => p.status === 'son_failed').length || 0;
  const playerCount = gameState?.players.length || 0;

  const computeValidSonCards = (hand) => {
    const bySuit = { '♠': [], '♥': [], '♦': [], '♣': [] };
    hand.forEach((card, idx) => {
      if (!card.isJoker) {
        bySuit[card.suit].push({ idx, value: card.value });
      }
    });

    const validCards = new Set();

    Object.values(bySuit).forEach(cards => {
      if (cards.length < 3) return;
      const sorted = [...cards].sort((a, b) => a.value - b.value);
      let seqStart = 0;
      for (let i = 1; i <= sorted.length; i++) {
        const isLast = i === sorted.length;
        const isConsecutive = !isLast && sorted[i].value === sorted[i - 1].value + 1;
        if (!isConsecutive) {
          const seqLength = i - seqStart;
          if (seqLength >= 3) {
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

  const computeValidBoxCards = (hand, minCards = 3) => {
    const ranksInBoxes = new Set(
    (gameState?.meja?.boxes || [])
      .flatMap(box => box.cards.filter(c => !c.isJoker).map(c => c.rank))
    );

    const byRank = {};
    hand.forEach((card, idx) => {
      if (!card.isJoker) {
        if (!byRank[card.rank]) byRank[card.rank] = [];
        byRank[card.rank].push(idx);
      }
    });

    const validCards = new Set();
    Object.entries(byRank).forEach(([rank, indices]) => {
      if (ranksInBoxes.has(rank)) return;
      if (indices.length >= minCards) {
        indices.forEach(idx => validCards.add(idx));
      }
    });

    return Array.from(validCards);
  };

  useEffect(() => {
    if (gameState?.phase === 'first_son' && lastPhase === 'first_son' && restartMessage) {
      const timer = setTimeout(() => setRestartMessage(null), 2000);
      return () => clearTimeout(timer);
    }
    setLastPhase(gameState?.phase);
  }, [gameState?.phase, restartMessage]);

  useEffect(() => {
    if (passMessage) {
      const timer = setTimeout(() => setPassMessage(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [passMessage]);

  useEffect(() => {
    if (!gameState || myPlayerIdx < 0 || !myPlayer) return;

    const moves = getValidMoves(myHand, gameState.meja.sons, gameState.meja.boxes);
    setValidMoves(moves);

    const validCards = new Set();
    const validSons = new Set();
    const validBoxes = new Set();

    moves.forEach(move => {
      if (move.cardIdx !== undefined) validCards.add(move.cardIdx);
      if (move.sonIdx !== undefined) validSons.add(move.sonIdx);
      if (move.boxIdx !== undefined) validBoxes.add(move.boxIdx);
    });

    setValidCardIndices(Array.from(validCards));
    setValidSonIndices(Array.from(validSons));
    setValidBoxIndices(Array.from(validBoxes));

    const sonCards = computeValidSonCards(myHand);
    setSonCreationCards(sonCards);

    const minBoxCards = isFirstSonPhase ? 5 : 3;
    const boxCards = computeValidBoxCards(myHand, minBoxCards);
    setBoxCreationCards(boxCards);

    const extendableSet = new Set();
    myHand.forEach((card, cardIdx) => {
      if (!card.isJoker) {
        gameState.meja.sons.forEach(son => {
          if (canExtendSonMultiple(son.cards, [card], 'left').valid ||
              canExtendSonMultiple(son.cards, [card], 'right').valid) {
            extendableSet.add(cardIdx);
          }
        });
      }
    });
    setExtendableCardsDefault(Array.from(extendableSet));

    const addableSet = new Set();
    myHand.forEach((card, cardIdx) => {
      gameState.meja.boxes.forEach(box => {
        const testBox = [...box.cards, card];
        if (isValidBox(testBox).valid) {
          addableSet.add(cardIdx);
        }
      });
    });
    setAddableCardsDefault(Array.from(addableSet));

    if (action === 'extend' && selectedCards.length > 0) {
      const extendCards = selectedCards.map(idx => myHand[idx]);
      const extendable = new Set();
      gameState.meja.sons.forEach((son, sonIdx) => {
        const leftValid = canExtendSonMultiple(son.cards, extendCards, 'left').valid;
        const rightValid = canExtendSonMultiple(son.cards, extendCards, 'right').valid;
        if (leftValid || rightValid) extendable.add(sonIdx);
      });
      setExtendableSons(Array.from(extendable));
    } else {
      setExtendableSons([]);
    }
  }, [gameState?.currentTurnIdx, gameState?.meja, gameState?.phase, action, selectedCards, myPlayerIdx]);

  if (loadingGame) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-2xl font-bold mb-4">Memuat permainan...</div>
          <div className="animate-spin text-4xl">🃏</div>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-2xl font-bold mb-4">⚠️ Data pemain tidak ditemukan</div>
          <p className="text-slate-400 mb-4">Silakan kembali ke lobby dan mulai ulang</p>
          <button
            onClick={() => navigate('/home')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg"
          >
            🏠 Kembali ke Lobby
          </button>
        </div>
      </div>
    );
  }

  if (!currentPlayer) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">⚠️ Giliran tidak valid</div>
      </div>
    );
  }

  // ── Handlers ─────────────────────────────────────────────────

  const handleCardClick = (cardIdx) => {
    if (!isMyTurnNow) return;
    if (myPlayer?.status !== 'active') return;
    if (selectedCards.includes(cardIdx)) {
      setSelectedCards(selectedCards.filter(i => i !== cardIdx));
    } else {
      setSelectedCards([...selectedCards, cardIdx]);
    }
  };

  const handleCreateSon = () => {
    if (selectedCards.length < 3) {
      alert('Butuh minimal 3 kartu untuk SON');
      return;
    }

    const selectedCardObjects = selectedCards.map(idx => myHand[idx]);
    const hasJoker = selectedCardObjects.some(c => c.isJoker);

    // ✅ Cek ambiguity posisi Joker (hanya di fase play, first_son diblokir di engine)
    if (hasJoker && gameState.phase !== 'first_son') {
      const { ambiguous, options } = detectSonJokerAmbiguity(selectedCardObjects);
      if (ambiguous) {
        setJokerPositionChoice({ cardIndices: selectedCards, options });
        return;
      }
    }

    playNewSon(myPlayerIdx, selectedCards);
    setSelectedCards([]);
    setAction(null);
  };

  const handleCreateBox = () => {
    const minCards = isFirstSonPhase ? 5 : 3;
    if (selectedCards.length < minCards) {
      alert(`Butuh minimal ${minCards} kartu untuk BOX`);
      return;
    }
    playNewBox(myPlayerIdx, selectedCards);
    setSelectedCards([]);
    setAction(null);
  };

  const handleExtendSon = (sonIdx, position) => {
    if (selectedCards.length < 1 || selectedCards.length > 2) {
      alert('Pilih 1-2 kartu untuk sambung ke SON');
      return;
    }
    extendSon(myPlayerIdx, selectedCards, sonIdx, position);
    setSelectedCards([]);
    setAction(null);
    setTargetIndex(null);
  };

  const handleAddToBox = (boxIdx) => {
    if (selectedCards.length < 1 || selectedCards.length > 2) {
      alert('Pilih 1 atau 2 kartu untuk tambah ke BOX');
      return;
    }
    addToBox(myPlayerIdx, selectedCards, boxIdx);  // ✅ kirim array, bukan [0]
    setSelectedCards([]);
    setAction(null);
    setTargetIndex(null);
  };

  const handlePass = () => {
    if (!isMyTurnNow) return;
    playerPass(myPlayerIdx);
    setPassMessage(true);
    setSelectedCards([]);
    setAction(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4">

      {/* ROUND END SCREEN */}
      {gameState.phase === 'round_end' && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-gradient-to-b from-yellow-900 to-yellow-800 p-8 rounded-lg border-4 border-yellow-400 text-center">
            {gameState.noWinner ? (
              <div className="text-4xl font-bold text-amber-400 mb-4">⏸️ RONDE SELESAI</div>
            ) : (
              <div className="text-4xl font-bold text-yellow-200 mb-4">🏆 RONDE SELESAI!</div>
            )}

            <div className="bg-slate-800 p-6 rounded-lg mb-6 border border-yellow-400">
              <h3 className="text-yellow-300 font-bold text-lg mb-4">📊 HASIL RONDE {gameState.round}</h3>

              {gameState.noWinner ? (
                <div className="text-amber-400 font-medium mb-3 text-sm">
                  Ronde berakhir — tidak ada pemenang
                </div>
              ) : (
                <div className="text-green-400 font-medium mb-3 text-sm">
                  🎉 {gameState.players.find(p => p.status === 'cate' || p.status === 'cate_tangan')?.name} CATE!
                </div>
              )}

              <div className="space-y-3">
                {[...gameState.players]
                  .sort((a, b) => b.score - a.score)
                  .map((player, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-700 p-3 rounded border-l-4"
                    style={{ borderLeftColor: ['purple', 'red', 'green', 'orange', 'blue'][idx % 5] }}
                  >
                    <div className="flex justify-between items-center">
                      <div className="text-left">
                        <div className="font-bold text-white">
                          {idx + 1}. {player.name}
                          {player.id === myPlayer?.id && (
                            <span className="text-xs text-slate-400 ml-1">(Kamu)</span>
                          )}
                        </div>
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
                        <div className="text-sm text-slate-400 mb-1">
                          Total: <span className="text-white font-bold">{player.totalScore || 0}</span>
                        </div>
                        <div className="text-2xl font-bold" style={{
                          color: player.score > 0 ? '#4ade80' : '#f87171'
                        }}>
                          {player.score > 0 ? '+' : ''}{player.score}
                        </div>
                        <div className="text-xs text-slate-400">ronde ini</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => nextRound()}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg text-lg mb-2"
            >
              ▶ Ronde Berikutnya
            </button>

            <button
              onClick={() => navigate('/home')}
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
          {restartMessage && (
            <div className="mb-4 p-4 bg-red-900 border-2 border-red-500 text-red-100 rounded font-bold text-center animate-pulse">
              {restartMessage}
            </div>
          )}

          {passMessage && (
            <div className="mb-4 p-3 bg-blue-900 border-2 border-blue-400 text-blue-100 rounded font-bold text-center animate-pulse">
              ✓ PAS - Giliran dilanjutkan ke pemain berikutnya...
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 mb-4 text-center">
            <div className="bg-slate-800 p-3 rounded border-l-4 border-purple-500">
              <div className="text-xs text-slate-400">Ronde</div>
              <div className="text-2xl font-bold text-white">{gameState.round}</div>
            </div>
            <div className="bg-slate-800 p-3 rounded border-l-4 border-blue-500">
              <div className="text-xs text-slate-400">Fase</div>
              <div className="text-sm font-bold text-white">
                {gameState.phase === 'first_son' ? '🎴 Son Pertama' : '🎮 Main'}
              </div>
            </div>
            <div className="bg-slate-800 p-3 rounded border-l-4 border-green-500">
              <div className="text-xs text-slate-400">Pemain</div>
              <div className="text-sm font-bold text-green-300">
                {gameState.players.filter(p => p.status === 'active').length} Active
              </div>
            </div>
          </div>

          {isFirstSonPhase && (
            <div className="bg-yellow-900 border-2 border-yellow-500 text-yellow-100 p-3 rounded mb-4 font-semibold">
              ⚠️ Fase Son Pertama: Pemain WAJIB keluarkan SON tanpa Joker (3+ kartu simbol sama berurutan)
            </div>
          )}

          <TurnIndicator gameState={gameState} />

          {isMyTurnNow && myPlayer?.status === 'active' && (
            <div className="mb-4 p-3 bg-purple-900 border-2 border-purple-400 rounded-lg text-center animate-pulse">
              <span className="text-purple-100 font-bold">🎯 Giliran Kamu!</span>
            </div>
          )}
          {!isMyTurnNow && myPlayer?.status === 'active' && (
            <div className="mb-4 p-3 bg-slate-700 border-2 border-slate-500 rounded-lg text-center">
              <span className="text-slate-300 text-sm">⏳ Menunggu giliran </span>
              <span className="text-white font-bold">{currentPlayer?.name}</span>
            </div>
          )}

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
                  <div className="font-bold">
                    {player.name}
                    {player.id === myPlayer?.id && ' 👤'}
                  </div>
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

            {/* SON */}
            {gameState.meja.sons.length > 0 && (
              <div className="mb-4">
                <h4 className="text-yellow-300 text-sm font-semibold mb-2">🎴 SON ({gameState.meja.sons.length})</h4>
                <div className="flex gap-3 flex-wrap">
                  {gameState.meja.sons.map((son, sonIdx) => (
                    <button
                      key={son.id}
                      onClick={() => {
                        if (!isMyTurnNow) return;
                        if (action === 'extend' && targetIndex === sonIdx) {
                          setAction(null);
                          setTargetIndex(null);
                        } else {
                          setAction('extend');
                          setTargetIndex(sonIdx);
                        }
                      }}
                      className={`bg-slate-800 p-2 rounded border-2 transition-all ${
                        action === 'extend' && targetIndex === sonIdx
                          ? 'border-purple-400 bg-purple-900'
                          : (action === 'extend' && selectedCards.length > 0
                            ? extendableSons.includes(sonIdx)
                            : validSonIndices.includes(sonIdx))
                          ? 'border-green-400 hover:border-green-300 shadow-lg shadow-green-500/50'
                          : 'border-yellow-500 hover:border-yellow-300'
                      }`}
                    >
                      <div className="flex gap-1 mb-1">
                        {son.cards.map((card, idx) => (
                          <div
                            key={`${son.id}-${idx}`}
                            className="w-12 h-14 bg-white rounded text-center text-xs font-bold flex flex-col items-center justify-center border border-gray-300"
                          >
                            {isFirstSonPhase && son.playerId !== myPlayer?.id ? (
                              <span className="text-2xl">🂠</span>
                            ) : card.label === 'JOKER' ? (
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
                      <div className="text-xs text-gray-300">{son.cards.length}/13 kartu</div>
                    </button>
                  ))}
                </div>

                {action === 'extend' && targetIndex !== null && selectedCards.length >= 1 && selectedCards.length <= 2 && (
                  <div className="mt-3 p-3 bg-purple-900 rounded border border-purple-400">
                    <p className="text-purple-100 text-sm mb-2">
                      Sambung {selectedCards.length} kartu ke mana?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleExtendSon(targetIndex, 'left')}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-semibold text-sm"
                      >
                        ← Kiri
                      </button>
                      <button
                        onClick={() => handleExtendSon(targetIndex, 'right')}
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
                        if (!isMyTurnNow) return;
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
                            {isFirstSonPhase && box.playerId !== myPlayer?.id ? (
                            <span className="text-2xl">🂠</span>
                          ) : card.label === 'JOKER' ? (
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
                      {/* ✅ FIX: Tampilkan rank dari non-Joker pertama */}
                      <div className="text-xs text-gray-300">
                        {isFirstSonPhase && box.playerId !== myPlayer?.id
                          ? `? × ${box.cards.length}`
                          : `${box.cards.find(c => !c.isJoker)?.label ?? '?'} × ${box.cards.length}`}
                      </div>
                    </button>
                  ))}
                </div>

                {action === 'add_box' && targetIndex !== null && selectedCards.length >= 1 && selectedCards.length <= 2 && (
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

            {gameState.meja.sons.length === 0 && gameState.meja.boxes.length === 0 && (
              <div className="flex items-center justify-center h-20 text-gray-400">
                Meja kosong - {isFirstSonPhase ? 'wajib buat SON pertama' : 'buat SON atau BOX'}
              </div>
            )}
          </div>

          <div className="h-1 bg-purple-500/30 my-4 rounded"></div>

          {/* Kartu tangan - giliran sendiri & active */}
          {isMyTurnNow && myPlayer?.status === 'active' && (
            <CardHand
              hand={myHand}
              onCardSelect={handleCardClick}
              selectedIndices={selectedCards}
              validIndices={
                action === 'son' ? sonCreationCards :
                action === 'box' ? boxCreationCards :
                (() => {
                  if (isFirstSonPhase) return sonCreationCards;

                  const validCards = new Set();
                  sonCreationCards.forEach(idx => validCards.add(idx));
                  boxCreationCards.forEach(idx => validCards.add(idx));
                  if (gameState.meja.sons.length > 0) {
                    extendableCardsDefault.forEach(idx => validCards.add(idx));
                  }
                  if (gameState.meja.boxes.length > 0) {
                    addableCardsDefault.forEach(idx => validCards.add(idx));
                  }
                  return Array.from(validCards);
                })()
              }
            />
          )}

          {/* Kartu tangan - menunggu giliran */}
          {!isMyTurnNow && myPlayer?.status === 'active' && (
            <div className="bg-slate-800 p-4 rounded-lg border-2 border-slate-600">
              <div className="text-slate-400 text-xs font-semibold mb-3 text-center">
                🃏 KARTU KAMU ({myHand.length} kartu) — Tunggu giliran untuk bermain
              </div>
              <div className="flex gap-1 flex-wrap justify-center">
                {myHand.map((card, idx) => (
                  <div
                    key={idx}
                    className="w-10 h-14 bg-slate-700 rounded border border-slate-500 flex flex-col items-center justify-center text-xs opacity-80 cursor-not-allowed"
                  >
                    {card.isJoker ? (
                      <span className="text-lg">🃏</span>
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

          {/* Sudah pas */}
          {myPlayer?.status === 'passed' && (
            <div className="bg-gradient-to-b from-slate-800 to-slate-900 p-6 rounded-lg border-4 border-red-500 text-center">
              <div className="text-3xl font-bold text-red-400 mb-2">⏸️ SUDAH PAS</div>
              <div className="text-red-200 font-semibold mb-2">Anda tidak akan mendapat giliran lagi di ronde ini</div>
              <div className="text-slate-400 text-sm">Mohon tunggu ronde selesai...</div>
              <div className="mt-4 flex justify-center gap-1 flex-wrap">
                {myHand.map((card, idx) => (
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

          {/* ACTION BUTTONS */}
          {isMyTurnNow && myPlayer?.status === 'active' && (
            <div className="bg-slate-900 border-t border-purple-500 p-4 space-y-2 mt-4">
              <div className="text-center text-slate-400 text-sm">
                {action === 'extend' && selectedCards.length > 0
                  ? `✓ ${selectedCards.length} kartu - Ready to extend`
                  : selectedCards.length > 0
                  ? `✓ ${selectedCards.length} kartu dipilih`
                  : 'Pilih kartu untuk action'}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    setAction(action === 'son' ? null : 'son');
                    if (action !== 'son') setSelectedCards([]);
                  }}
                  className={`py-2 rounded font-bold transition-all ${
                    action === 'son'
                      ? 'bg-yellow-600 text-white'
                      : 'bg-yellow-700 hover:bg-yellow-600 text-white'
                  }`}
                >
                  🎴 SON
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
                  📦 BOX {isFirstSonPhase && '(5+)'}
                </button>

                {isFirstSonPhase && (
                  <button
                    onClick={() => {
                      const nextFailCount = failedSonCount + 1;
                      let msg = '';
                      let willRestart = false;

                      if (playerCount === 4) {
                        willRestart = true;
                        msg = 'Gagal Son → Ronde akan DIULANG\nPoin Anda: 0 (tidak ada pengurangan)\nKartu akan dibagikan ulang ke semua pemain';
                      } else if (playerCount === 5) {
                        if (nextFailCount >= 2) {
                          willRestart = true;
                          msg = 'Gagal Son → Ronde akan DIULANG\nPoin Anda: 0 (tidak ada pengurangan)\nKartu akan dibagikan ulang ke semua pemain';
                        } else {
                          willRestart = false;
                          msg = 'Gagal Son → Anda akan keluar dari ronde ini\nPoin Anda: -50\nPermainan lanjut dengan pemain lainnya';
                        }
                      }

                      if (confirm(`Anda tidak bisa membuat SON?\n\n${msg}\n\nTekan OK untuk lanjut.`)) {
                        declareFailFirstSon(myPlayerIdx);
                        setSelectedCards([]);
                        setAction(null);
                        if (willRestart) {
                          setRestartMessage('⚠️ Ronde Diulang! Kartu akan dibagikan kembali...');
                        }
                      }
                    }}
                    className="bg-red-700 hover:bg-red-600 text-white font-bold py-2 rounded"
                  >
                    ❌ Gagal Son
                  </button>
                )}

                {!isFirstSonPhase && (() => {
                const activeCount = gameState.players.filter(p => p.status === 'active').length;
                const canPass = activeCount > 1 || validMoves.length === 0;
                return (
                  <button
                    onClick={() => {
                      if (!canPass) return;
                      if (confirm('Yakin ingin PAS?\n\nAnda tidak akan mendapat giliran lagi di ronde ini.')) {
                        handlePass();
                      }
                    }}
                    disabled={!canPass}
                    className={`py-2 rounded font-bold transition-all ${
                      canPass
                        ? 'bg-slate-700 hover:bg-slate-600 text-white'
                        : 'bg-slate-700 opacity-40 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    👋 Pas
                  </button>
                );
                })()}
              </div>

              {action === 'son' && (
                <button
                  onClick={handleCreateSon}
                  disabled={selectedCards.length < 3}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white font-bold py-2 rounded"
                >
                  ✓ Buat SON ({selectedCards.length}/3+)
                </button>
              )}

              {action === 'box' && (
                <button
                  onClick={handleCreateBox}
                  disabled={selectedCards.length < (isFirstSonPhase ? 5 : 3)}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white font-bold py-2 rounded"
                >
                  ✓ Buat BOX ({selectedCards.length}/{isFirstSonPhase ? '5+' : '3+'})
                </button>
              )}
            </div>
          )}

          {/* ✅ Dialog Pilihan Posisi Joker */}
          {jokerPositionChoice && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
              <div className="bg-slate-800 border-2 border-yellow-400 rounded-xl p-6 max-w-sm w-full mx-4">
                <div className="text-yellow-300 font-bold text-lg mb-2 text-center">
                  🃏 Posisi Joker?
                </div>
                <p className="text-slate-300 text-sm text-center mb-4">
                  Joker bisa ditempatkan di lebih dari satu posisi. Pilih posisi Joker:
                </p>
                <div className="space-y-2">
                  {jokerPositionChoice.options.includes('kiri') && (
                    <button
                      onClick={() => {
                        playNewSon(myPlayerIdx, jokerPositionChoice.cardIndices, 'kiri');
                        setJokerPositionChoice(null);
                        setSelectedCards([]);
                        setAction(null);
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg"
                    >
                      ← Joker di Kiri (nilai lebih kecil)
                    </button>
                  )}
                  {jokerPositionChoice.options.includes('gap') && (
                    <button
                      onClick={() => {
                        playNewSon(myPlayerIdx, jokerPositionChoice.cardIndices, 'gap');
                        setJokerPositionChoice(null);
                        setSelectedCards([]);
                        setAction(null);
                      }}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg"
                    >
                      ↕ Joker di Tengah (isi gap)
                    </button>
                  )}
                  {jokerPositionChoice.options.includes('kanan') && (
                    <button
                      onClick={() => {
                        playNewSon(myPlayerIdx, jokerPositionChoice.cardIndices, 'kanan');
                        setJokerPositionChoice(null);
                        setSelectedCards([]);
                        setAction(null);
                      }}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg"
                    >
                      Joker di Kanan → (nilai lebih besar)
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setJokerPositionChoice(null)}
                  className="w-full mt-3 bg-slate-600 hover:bg-slate-500 text-white py-2 rounded-lg text-sm"
                >
                  Batal
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
