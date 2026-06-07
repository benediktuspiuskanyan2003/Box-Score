import React, { useState } from 'react';

/**
 * Component untuk memilih siapa yang CATE (menang ronde)
 * Juga input jumlah joker yang digunakan saat CATE
 * Maksimal 4 joker per ronde
 */
export function CateSelector({
  players,
  onSelect,
  initialCate = null,
  initialJokers = 0,
  maxJokers = 4,
  jokersUsedTotal = 0
}) {
  const [selectedCate, setSelectedCate] = useState(initialCate);
  const [jokerCount, setJokerCount] = useState(initialJokers);

  const handleCateSelect = (playerId) => {
    const newCate = selectedCate === playerId ? null : playerId;
    setSelectedCate(newCate);
    onSelect(newCate, jokerCount);
  };

  const handleJokerChange = (e) => {
    let count = Math.max(0, parseInt(e.target.value) || 0);
    // Enforce max joker limit
    count = Math.min(count, maxJokers);
    setJokerCount(count);
    onSelect(selectedCate, count);
  };

  const selectedPlayer = players.find(p => p.id === selectedCate);

  return (
    <div className="bg-white rounded-lg p-4 shadow-md">
      <h3 className="font-bold text-lg mb-4">Siapa yang CATE? 🏆</h3>

      <div className="space-y-2 mb-6">
        <button
          onClick={() => {
            setSelectedCate(null);
            setJokerCount(0);
            onSelect(null, 0);
          }}
          className={`w-full p-3 rounded-lg border-2 font-semibold transition-all ${
            selectedCate === null
              ? 'bg-gray-200 border-gray-400 text-gray-900'
              : 'bg-gray-50 border-gray-300 text-gray-700 hover:border-gray-400'
          }`}
        >
          {selectedCate === null && '✓ '} 
          Tidak Ada CATE (Skip)
        </button>

        {players.map(player => (
          <button
            key={player.id}
            onClick={() => handleCateSelect(player.id)}
            className={`w-full p-3 rounded-lg border-2 font-semibold transition-all ${
              selectedCate === player.id
                ? 'bg-yellow-100 border-yellow-400 text-yellow-900'
                : 'bg-gray-50 border-gray-300 text-gray-700 hover:border-gray-400'
            }`}
          >
            {selectedCate === player.id && '✓ '} 
            {player.name}
          </button>
        ))}
      </div>

      {selectedPlayer && (
        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Joker yang dipakai saat CATE:
          </label>
          
          {/* Joker Usage Info */}
          <div className="bg-white border border-blue-200 rounded-lg p-2 mb-3 text-center text-xs">
            <p className="text-gray-600">
              🃏 Joker: <span className="font-bold">{jokersUsedTotal}/4</span> sudah digunakan (maksimal {maxJokers} untuk CATE)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="number"
              min="0"
              max={maxJokers}
              value={jokerCount}
              onChange={handleJokerChange}
              disabled={maxJokers === 0}
              className="border border-gray-300 rounded px-3 py-2 w-20 text-center font-bold disabled:bg-gray-100"
            />
            <span className="text-sm text-blue-700">
              {jokerCount > 0 ? `× 100 = +${jokerCount * 100}` : 'Tanpa joker = +50'}
            </span>
          </div>
          
          {maxJokers === 0 && (
            <div className="mt-3 text-xs text-red-600 font-semibold">
              ⚠️ Semua joker sudah digunakan!
            </div>
          )}
          
          <div className="mt-3 text-sm bg-white p-2 rounded border border-blue-200">
            <p className="text-xs text-gray-600 mb-1">Poin CATE:</p>
            <p className="font-bold text-green-600">
              {jokerCount > 0 ? `+${jokerCount * 100}` : '+50'}
            </p>
          </div>
        </div>
      )}

      {selectedCate === null && (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 text-center text-yellow-900 font-semibold">
          Tidak ada CATE - Semua pemain input kartu
        </div>
      )}
    </div>
  );
}

