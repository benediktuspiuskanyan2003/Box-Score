import React, { useState } from 'react';

/**
 * CardHand - Tampil kartu di tangan pemain aktif
 */
export function CardHand({ hand = [], onCardSelect, selectedIndices = [], validIndices = [] }) {
  const [sortBy, setSortBy] = useState('suit'); // 'suit' atau 'rank'

  // Sort kartu berdasarkan suit + rank
  const sortedHand = [...hand].sort((a, b) => {
    if (sortBy === 'suit') {
      const suitOrder = ['♠', '♥', '♦', '♣'];
      const suitDiff = suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
      if (suitDiff !== 0) return suitDiff;
      return a.value - b.value;
    } else {
      return a.value - b.value;
    }
  });

  // Get original indices setelah sort
  const sortedIndices = sortedHand.map(card => {
    return hand.findIndex(c => c.id === card.id);
  });

  return (
    <div className="bg-slate-900 border-t-2 border-purple-500 p-4 rounded-t-lg">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-white font-bold">Kartu di Tangan ({hand.length})</h3>
        <button
          onClick={() => setSortBy(sortBy === 'suit' ? 'rank' : 'suit')}
          className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded"
        >
          Urutkan: {sortBy === 'suit' ? 'Suit' : 'Rank'}
        </button>
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-6 gap-2">
        {sortedIndices.map((originalIdx, displayIdx) => {
          const card = hand[originalIdx];
          const isSelected = selectedIndices.includes(originalIdx);
          const isValid = validIndices.includes(originalIdx);

          return (
            <button
              key={card.id}
              onClick={() => onCardSelect?.(originalIdx)}
              className={`p-2 rounded border-2 transition-all ${
                isSelected
                  ? 'bg-purple-600 border-purple-300 scale-105'
                  : isValid
                  ? 'bg-slate-800 border-green-400 shadow-lg shadow-green-500/50 hover:border-green-300'
                  : 'bg-slate-800 border-slate-600 hover:border-purple-400'
              }`}
            >
              {/* Card Display */}
              <div className={`text-center font-bold text-sm flex flex-col items-center gap-1 ${
                card.isJoker ? 'text-yellow-400' :
                card.suit === '♥' || card.suit === '♦' ? 'text-red-400' :
                'text-white'
              }`}>
                {card.label === 'JOKER' ? (
                  <span className="text-xl">🃏</span>
                ) : (
                  <>
                    <span className="text-xs">{card.suit}</span>
                    <span>{card.label}</span>
                  </>
                )}
              </div>
              {/* Valid indicator */}
              {isValid && !isSelected && (
                <div className="absolute top-0 right-0 w-2 h-2 bg-green-400 rounded-full"></div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

