import React from 'react';

/**
 * TurnIndicator - tampil info giliran pemain saat ini
 */
export function TurnIndicator({ gameState }) {
  if (!gameState) return null;

  const currentPlayer = gameState.players[gameState.currentTurnIdx];
  const phase = gameState.phase === 'first_sun' ? 'Sun Pertama' : 'Main';

  return (
    <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-lg mb-4">
      <div className="text-xs opacity-75">Giliran</div>
      <div className="text-2xl font-bold">{currentPlayer?.name}</div>
      <div className="text-sm opacity-90">{phase}</div>
    </div>
  );
}
