import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGroup } from '../hooks/useGroup';
import { useGame } from '../hooks/useGame';
import { useRound } from '../hooks/useRound';
import { CateSelector } from '../components/CateSelector';
import { CardCalculator } from '../components/CardCalculator';
import { SunFailSelector } from '../components/SunFailSelector';
import { PlayerRow } from '../components/PlayerRow';
import { calculateRoundScore } from '../utils/scoreCalculator';

/**
 * Halaman untuk input ronde baru dengan interface bergantian
 */
export function RoundInput() {
  const { groupCode } = useParams();
  const navigate = useNavigate();
  const { group, players, fetchGroup } = useGroup();
  const { game, rounds, getOrCreateGame } = useGame(group?.id);
  const { calculateAndSaveRound, loading } = useRound(game?.id, group?.id, players, group?.minus_limit);

  const [activeTab, setActiveTab] = useState('cate');
  const [catePlayerId, setCatePlayerId] = useState(null);
  const [jokerUsedByCate, setJokerUsedByCate] = useState(0);
  const [playerCardScores, setPlayerCardScores] = useState({});
  const [sunFailedPlayers, setSunFailedPlayers] = useState([]);
  const [preview, setPreview] = useState({});
  const [currentCardPlayerIndex, setCurrentCardPlayerIndex] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (!group) {
        await fetchGroup(groupCode);
      }
    };
    init();
  }, [groupCode]);

  useEffect(() => {
    const init = async () => {
      if (group?.id && !game) {
        await getOrCreateGame();
      }
    };
    init();
  }, [group?.id]);

  // Generate preview of scores
  useEffect(() => {
    const newPreview = {};
    players.forEach(player => {
      const cardScore = playerCardScores[player.id] || 0;
      const jokerHeld = playerCardScores[`${player.id}_jokers`] || 0;
      const isCate = player.id === catePlayerId;
      const sunFailed = sunFailedPlayers.includes(player.id);

      const score = calculateRoundScore({
        isCate,
        jokerUsed: isCate ? jokerUsedByCate : 0,
        jokerHeld: !isCate ? jokerHeld : 0,
        sunFailed,
        cardScore: isCate ? 0 : cardScore
      });

      newPreview[player.id] = { score, isCate, sunFailed };
    });
    setPreview(newPreview);
  }, [catePlayerId, jokerUsedByCate, playerCardScores, sunFailedPlayers, players]);

  // Get list pemain yang perlu input kartu
  const playersNeedingCardInput = catePlayerId === null ? players : players.filter(p => p.id !== catePlayerId);
  const currentCardPlayer = playersNeedingCardInput[currentCardPlayerIndex];

  const handleCardSave = (cardData) => {
    setPlayerCardScores(prev => ({
      ...prev,
      [currentCardPlayer.id]: cardData.cardScoreOnly || 0, // Store ONLY card score (no joker)
      [`${currentCardPlayer.id}_jokers`]: cardData.jokers // Store joker count separately
    }));

    // Pindah ke pemain berikutnya atau ke Sun tab
    if (currentCardPlayerIndex < playersNeedingCardInput.length - 1) {
      setCurrentCardPlayerIndex(currentCardPlayerIndex + 1);
    } else {
      setActiveTab('sun');
    }
  };

  const handleEditCard = (playerIndex) => {
    setCurrentCardPlayerIndex(playerIndex);
    setActiveTab('cards');
  };

  const handleSubmitRound = async () => {
    // Check if 2+ players failed Sun
    if (sunFailedPlayers.length >= 2) {
      alert('⚠️ 2+ pemain gagal Sun → Ronde diulang, tidak disimpan');
      setSunFailedPlayers([]);
      return;
    }

    try {
      const result = await calculateAndSaveRound(
        rounds.length + 1,
        catePlayerId,
        jokerUsedByCate,
        playerCardScores,
        sunFailedPlayers
      );

      if (!result) {
        alert('Error: Gagal menyimpan ronde');
        return;
      }

      // Reset form
      setCatePlayerId(null);
      setJokerUsedByCate(0);
      setPlayerCardScores({});
      setSunFailedPlayers([]);
      setCurrentCardPlayerIndex(0);

      // Wait a bit for database to sync, then go back to game
      console.log('Round saved, navigating back...');
      setTimeout(() => {
        navigate(`/game/${groupCode}?refresh=1`);
      }, 500);
    } catch (err) {
      console.error('Submit round error:', err);
      alert('Error: ' + err.message);
    }
  };

  if (!group || !game) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Memuat...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 pb-40">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <button
            onClick={() => navigate(`/game/${groupCode}`)}
            className="text-blue-600 font-semibold mb-2"
          >
            ← Kembali
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Input Ronde Baru</h1>
          <p className="text-xs text-gray-500">Ronde #{rounds.length + 1}</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 bg-white rounded-lg p-2 shadow-sm">
          <button
            onClick={() => setActiveTab('cate')}
            className={`flex-1 py-2 px-3 rounded font-semibold transition-all ${
              activeTab === 'cate'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            1️⃣ CATE
          </button>
          <button
            onClick={() => setActiveTab('cards')}
            className={`flex-1 py-2 px-3 rounded font-semibold transition-all ${
              activeTab === 'cards'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            2️⃣ Kartu
          </button>
          <button
            onClick={() => setActiveTab('sun')}
            className={`flex-1 py-2 px-3 rounded font-semibold transition-all ${
              activeTab === 'sun'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            3️⃣ Sun
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          {/* ===== TAB CATE ===== */}
          {activeTab === 'cate' && (
            <div className="space-y-4">
              {(() => {
                // Calculate jokers from players who already input cards
                const jokersFromCardPlayers = playersNeedingCardInput
                  .slice(0, currentCardPlayerIndex)
                  .reduce((sum, p) => sum + (playerCardScores[`${p.id}_jokers`] || 0), 0);
                
                const totalJokersUsed = jokersFromCardPlayers;
                const maxJokersForCate = Math.max(0, 4 - totalJokersUsed);

                return (
                  <CateSelector
                    players={players}
                    onSelect={(playerId, jokers) => {
                      setCatePlayerId(playerId);
                      setJokerUsedByCate(jokers);
                      setCurrentCardPlayerIndex(0);
                    }}
                    initialCate={catePlayerId}
                    initialJokers={jokerUsedByCate}
                    maxJokers={maxJokersForCate}
                    jokersUsedTotal={totalJokersUsed}
                  />
                );
              })()}
              {catePlayerId !== null && (
                <div className="bg-green-50 border-2 border-green-300 rounded-lg p-3 text-center">
                  <p className="text-green-900 font-semibold">
                    ✓ {players.find(p => p.id === catePlayerId)?.name} jadi CATE
                  </p>
                </div>
              )}
              <button
                onClick={() => {
                  setActiveTab('cards');
                  setCurrentCardPlayerIndex(0);
                }}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition-all"
              >
                Lanjut ke Kartu →
              </button>
            </div>
          )}

          {/* ===== TAB KARTU (BERGANTIAN) ===== */}
          {activeTab === 'cards' && currentCardPlayer && (
            <div className="space-y-4">
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 text-center">
                <p className="text-sm text-blue-600">
                  Pemain {currentCardPlayerIndex + 1} dari {playersNeedingCardInput.length}
                </p>
                <p className="text-xl font-bold text-blue-900">
                  Input Kartu {currentCardPlayer.name}
                </p>
              </div>

              {(() => {
                // Calculate jokers used so far
                const jokersUsedByOthers = playersNeedingCardInput
                  .slice(0, currentCardPlayerIndex)
                  .reduce((sum, p) => sum + (playerCardScores[`${p.id}_jokers`] || 0), 0);
                
                const jokersFromCate = catePlayerId !== null ? jokerUsedByCate : 0;
                const totalJokersUsed = jokersUsedByOthers + jokersFromCate;
                const maxJokersAvailable = Math.max(0, 4 - totalJokersUsed);

                return (
                  <CardCalculator
                    playerName={currentCardPlayer.name}
                    onSave={handleCardSave}
                    maxJokers={maxJokersAvailable}
                    jokersUsedTotal={totalJokersUsed}
                  />
                );
              })()}

              {/* Navigation Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentCardPlayerIndex(Math.max(0, currentCardPlayerIndex - 1))}
                  disabled={currentCardPlayerIndex === 0}
                  className="flex-1 bg-gray-400 hover:bg-gray-500 disabled:bg-gray-300 text-white font-bold py-3 rounded-lg transition-all"
                >
                  ← Sebelumnya
                </button>
                <button
                  onClick={() => {
                    setCurrentCardPlayerIndex(Math.min(playersNeedingCardInput.length - 1, currentCardPlayerIndex + 1));
                    setActiveTab('cards');
                  }}
                  disabled={currentCardPlayerIndex === playersNeedingCardInput.length - 1}
                  className="flex-1 bg-gray-400 hover:bg-gray-500 disabled:bg-gray-300 text-white font-bold py-3 rounded-lg transition-all"
                >
                  Selanjutnya →
                </button>
              </div>

              <button
                onClick={() => setActiveTab('sun')}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition-all"
              >
                Lanjut ke Sun →
              </button>
            </div>
          )}

          {/* ===== TAB SUN ===== */}
          {activeTab === 'sun' && (
            <SunFailSelector
              players={players}
              onSelect={setSunFailedPlayers}
              initialFailed={sunFailedPlayers}
            />
          )}
        </div>

        {/* Preview */}
        <div className="bg-white rounded-lg p-4 shadow-md mb-4">
          <h3 className="font-bold text-lg text-gray-900 mb-3">Preview Skor</h3>
          <div className="space-y-2">
            {players.map((player, idx) => {
              const p = preview[player.id] || {};
              const statusIcon = p.sunFailed
                ? '☀️'
                : p.isCate
                ? '🏆'
                : '📉';
              const isCardInputted = playerCardScores[player.id] !== undefined;

              return (
                <div
                  key={player.id}
                  onClick={() => {
                    if (!p.isCate) {
                      const playerIdx = playersNeedingCardInput.findIndex(pl => pl.id === player.id);
                      if (playerIdx >= 0) handleEditCard(playerIdx);
                    }
                  }}
                  className={`flex items-center justify-between p-2 bg-gray-50 rounded text-sm transition-all ${
                    !p.isCate && isCardInputted ? 'cursor-pointer hover:bg-blue-100' : ''
                  }`}
                >
                  <span>
                    {statusIcon} {player.name}
                    {!p.isCate && isCardInputted && <span className="ml-2 text-xs text-blue-600">✏️ edit</span>}
                  </span>
                  <span
                    className={`font-bold ${
                      p.score >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {p.score >= 0 ? '+' : ''}{p.score}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={() => setShowConfirmModal(true)}
          disabled={loading || sunFailedPlayers.length >= 2}
          className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-lg transition-all text-lg"
        >
          {loading ? '💾 Menyimpan...' : '✓ Simpan Ronde'}
        </button>
      </div>

      {/* MODAL KONFIRMASI */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Simpan Ronde?</h2>
            <p className="text-gray-700 mb-6">
              Pastikan semua input sudah benar sebelum menyimpan ronde.
            </p>

            {/* Preview ringkas */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6 max-h-48 overflow-y-auto">
              {players.map(player => {
                const p = preview[player.id] || {};
                return (
                  <div key={player.id} className="flex justify-between text-sm mb-2">
                    <span className="font-semibold">{player.name}</span>
                    <span className={p.score >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {p.score >= 0 ? '+' : ''}{p.score}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-bold py-3 rounded-lg transition-all"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  handleSubmitRound();
                }}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg transition-all"
              >
                Ya, Simpan ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

