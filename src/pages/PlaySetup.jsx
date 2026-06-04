import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * PlaySetup - Setup game baru sebelum main
 */
export function PlaySetup() {
  const navigate = useNavigate();
  const [playerCount, setPlayerCount] = useState(4);
  const [players, setPlayers] = useState(
    Array(4).fill(null).map((_, i) => ({ id: `p${i}`, name: '' }))
  );
  const [minusLimit, setMinusLimit] = useState(-300);

  // Step 2: Input nama pemain
  const handlePlayerNameChange = (idx, name) => {
    const newPlayers = [...players];
    newPlayers[idx] = { id: `p${idx}`, name };
    setPlayers(newPlayers);
  };

  // Handle start game
  const handleStartGame = () => {
    // Validate
    if (players.some(p => !p.name?.trim())) {
      alert('Semua pemain harus punya nama');
      return;
    }

    // Navigate to game dengan player data
    navigate('/play/game', {
      state: {
        players,
        minusLimit
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4 pb-20">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text mb-2">
          🎮 BOX Game
        </h1>
        <p className="text-slate-400">Setup Permainan</p>
      </div>

      {/* Step 1: Mode Selection */}
      <div className="max-w-md mx-auto">
          {/* Player Count */}
          <div className="bg-slate-800 p-4 rounded-lg mb-4 border border-purple-500">
            <label className="text-white font-semibold mb-3 block">Jumlah Pemain</label>
            <div className="flex gap-2">
              {[4, 5].map(num => (
                <button
                  key={num}
                  onClick={() => {
                    setPlayerCount(num);
                    setPlayers(Array(num).fill(null).map((_, i) => ({ id: `p${i}`, name: '' })));
                  }}
                  className={`flex-1 py-3 rounded font-bold transition-all ${
                    playerCount === num
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {num} Orang
                </button>
              ))}
            </div>
          </div>

          {/* Player Names */}
          <div className="bg-slate-800 p-4 rounded-lg mb-4 border border-purple-500">
            <label className="text-white font-semibold mb-3 block">Nama Pemain</label>
            <div className="space-y-2">
              {players.map((player, idx) => (
                <input
                  key={idx}
                  type="text"
                  placeholder={`Pemain ${idx + 1}`}
                  value={player.name}
                  onChange={(e) => handlePlayerNameChange(idx, e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded focus:outline-none focus:border-purple-400"
                />
              ))}
            </div>
          </div>

          {/* Minus Limit */}
          <div className="bg-slate-800 p-4 rounded-lg mb-4 border border-purple-500">
            <label className="text-white font-semibold mb-3 block">Batas Minus</label>
            <div className="flex gap-2">
              {[-300, -400, -500].map(limit => (
                <button
                  key={limit}
                  onClick={() => setMinusLimit(limit)}
                  className={`flex-1 py-2 rounded font-bold transition-all ${
                    minusLimit === limit
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {limit}
                </button>
              ))}
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={handleStartGame}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 rounded-lg transition-all transform hover:scale-105"
          >
            Mulai Permainan 🎲
          </button>
        </div>
    </div>
  );
}
