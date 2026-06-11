import React, { useState } from 'react';

/**
 * Component untuk menandai pemain yang gagal Son di awal ronde
 * - 1 pemain gagal: dapat -50, keluar dari ronde
 * - 2+ pemain gagal: ronde diulang (tidak disimpan)
 */
export function SonFailSelector({
  players,
  onSelect,
  initialFailed = []
}) {
  const [failedPlayers, setFailedPlayers] = useState(initialFailed);

  const handleToggleFail = (playerId) => {
    let newFailed;
    if (failedPlayers.includes(playerId)) {
      newFailed = failedPlayers.filter(id => id !== playerId);
    } else {
      newFailed = [...failedPlayers, playerId];
    }
    setFailedPlayers(newFailed);
    onSelect(newFailed);
  };

  const failedPlayerNames = failedPlayers.map(id => 
    players.find(p => p.id === id)?.name
  ).filter(Boolean);

  return (
    <div className="bg-white rounded-lg p-4 shadow-md">
      <h3 className="font-bold text-lg mb-4">Yang Gagal Son ☀️</h3>

      <div className="space-y-2 mb-6">
        {players.map(player => (
          <button
            key={player.id}
            onClick={() => handleToggleFail(player.id)}
            className={`w-full p-3 rounded-lg border-2 font-semibold transition-all ${
              failedPlayers.includes(player.id)
                ? 'bg-red-100 border-red-400 text-red-900'
                : 'bg-gray-50 border-gray-300 text-gray-700 hover:border-gray-400'
            }`}
          >
            {failedPlayers.includes(player.id) && '✓ '} 
            {player.name}
            {failedPlayers.includes(player.id) && ' -50'}
          </button>
        ))}
      </div>

      {failedPlayerNames.length > 0 && (
        <div className={`border-2 rounded-lg p-4 ${
          failedPlayerNames.length === 1 
            ? 'bg-orange-50 border-orange-300'
            : 'bg-red-50 border-red-400'
        }`}>
          <div className="font-semibold mb-2">
            {failedPlayerNames.length === 1 
              ? '1 pemain gagal Son'
              : `${failedPlayerNames.length} pemain gagal Son`}
          </div>
          <div className="text-sm mb-2">{failedPlayerNames.join(', ')}</div>
          
          {failedPlayerNames.length === 1 ? (
            <div className="text-sm text-orange-700">
              ✓ Pemain ini dapat -50 dan keluar dari ronde
            </div>
          ) : (
            <div className="text-sm text-red-700 font-semibold">
              ⚠️ 2+ pemain gagal Son → Ronde diulang (tidak disimpan)
            </div>
          )}
        </div>
      )}

      {failedPlayerNames.length === 0 && (
        <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-4 text-center text-gray-600 text-sm">
          Tandai pemain yang gagal Son (jika ada)
        </div>
      )}
    </div>
  );
}

