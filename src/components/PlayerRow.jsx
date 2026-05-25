import React from 'react';
import { ScoreBadge } from './ScoreBadge';

/**
 * Baris pemain dalam papan skor
 * Menampilkan nama, total skor, dan indikator reset
 */
export function PlayerRow({ 
  playerName, 
  score, 
  roundCount = 0,
  wasReset = false,
  isHighlight = false
}) {
  return (
    <div 
      className={`flex items-center justify-between p-4 rounded-lg mb-3 border-2 transition-all ${
        isHighlight 
          ? 'bg-yellow-50 border-yellow-300' 
          : 'bg-gray-50 border-gray-200'
      }`}
    >
      <div className="flex-1">
        <div className="font-bold text-lg text-gray-900">{playerName}</div>
        {roundCount > 0 && (
          <div className="text-xs text-gray-500">
            {roundCount} ronde {wasReset && '• Direset'}
          </div>
        )}
      </div>
      
      <div className="text-right">
        <ScoreBadge score={score} size="lg" />
      </div>
    </div>
  );
}
