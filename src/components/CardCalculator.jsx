import React, { useState, useEffect } from 'react';
import { CARD_VALUES, MAX_CARDS_PER_TYPE } from '../utils/constants';

/**
 * Interactive card calculator untuk menghitung total minus kartu sisa
 * - Joker override semua kartu lain (no mixing)
 * - 10/J/Q/K digabungkan (nilai sama)
 * - Auto reset setelah save
 * - Batasan maksimal 4 joker per ronde
 */
export function CardCalculator({ 
  onSave, 
  playerName,
  maxJokers = 4,
  jokersUsedTotal = 0
}) {
  const [cardCounts, setCardCounts] = useState({});
  const [selectedJokers, setSelectedJokers] = useState(0);
  const [faceCardMenu, setFaceCardMenu] = useState(null);

  // Card list: A, 2-9, 10/JQK (combined), JOKER
  const cardList = ['A', '2', '3', '4', '5', '6', '7', '8', '9'];
  const faceCards = ['10', 'J', 'Q', 'K'];

  // Hitung total minus
  const calculateTotal = () => {
    let total = 0;
    
    // Hitung kartu saja (tanpa joker)
    Object.entries(cardCounts).forEach(([cardName, count]) => {
      if (CARD_VALUES[cardName]) {
        total += CARD_VALUES[cardName] * count;
      }
    });
    
    // Jika ada joker, tampilkan joker calculation untuk UI
    if (selectedJokers > 0) {
      total += selectedJokers * 100; // -100 per joker
    }
    
    return total;
  };

  const totalMinus = calculateTotal();
  const hasJoker = selectedJokers > 0;
  const hasCards = Object.keys(cardCounts).length > 0;

  const handleCardTap = (cardName) => {
    if (hasJoker) return; // Disabled jika ada joker
    
    setCardCounts(prev => {
      const current = prev[cardName] || 0;
      if (current < MAX_CARDS_PER_TYPE) {
        return { ...prev, [cardName]: current + 1 };
      }
      return prev;
    });
  };

  const handleFaceCardTap = (faceCard) => {
    if (hasJoker) return; // Disabled jika ada joker
    
    setCardCounts(prev => {
      const current = prev[faceCard] || 0;
      if (current < MAX_CARDS_PER_TYPE) {
        return { ...prev, [faceCard]: current + 1 };
      }
      return prev;
    });
  };

  const handleCardRemove = (cardName) => {
    setCardCounts(prev => {
      const current = prev[cardName] || 0;
      if (current > 0) {
        const newCounts = { ...prev };
        newCounts[cardName] = current - 1;
        if (newCounts[cardName] === 0) {
          delete newCounts[cardName];
        }
        return newCounts;
      }
      return prev;
    });
  };

  const handleJokerTap = () => {
    // Check if at limit
    if (selectedJokers >= maxJokers) {
      return; // Can't add more jokers
    }

    // Jika pilih joker dan sudah ada kartu lain, clear kartu lain
    if (!hasJoker && hasCards) {
      setCardCounts({});
    }
    
    if (selectedJokers < maxJokers) {
      setSelectedJokers(selectedJokers + 1);
    }
  };

  const handleJokerRemove = () => {
    if (selectedJokers > 0) {
      setSelectedJokers(selectedJokers - 1);
    }
  };

  const handleReset = () => {
    setCardCounts({});
    setSelectedJokers(0);
  };

  const handleSave = () => {
    // Calculate card score ONLY (without joker)
    let cardScoreOnly = 0;
    Object.entries(cardCounts).forEach(([cardName, count]) => {
      if (CARD_VALUES[cardName]) {
        cardScoreOnly += CARD_VALUES[cardName] * count;
      }
    });

    onSave({
      cardCounts,
      jokers: selectedJokers,
      totalMinus,
      cardScoreOnly // Pass card-only score separately
    });
    
    // Auto reset setelah save
    setTimeout(() => {
      setCardCounts({});
      setSelectedJokers(0);
    }, 100);
  };

  return (
    <div className="bg-white rounded-lg p-4 shadow-md">
      <h3 className="font-bold text-lg mb-2 text-center">{playerName}</h3>
      
      {/* Joker Usage Info */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 mb-3 text-center text-sm">
        <p className="text-purple-900">
          🃏 Joker: <span className="font-bold">{jokersUsedTotal}/4</span> sudah digunakan (sisa: {maxJokers} untuk pemain ini)
        </p>
      </div>
      
      {/* Status */}
      {hasJoker && (
        <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-2 mb-4 text-center">
          <p className="text-xs text-purple-900 font-semibold">
            ⚠️ Joker dipilih - Kartu lain otomatis disabled
          </p>
        </div>
      )}

      {/* Card Grid: A-9 */}
      <div className="grid grid-cols-9 gap-2 mb-4">
        {cardList.map(cardName => {
          const count = cardCounts[cardName] || 0;
          const value = CARD_VALUES[cardName];
          
          return (
            <button
              key={cardName}
              onClick={() => handleCardTap(cardName)}
              disabled={hasJoker}
              className={`relative py-3 px-1 rounded text-sm font-bold transition-all ${
                hasJoker
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white active:scale-95'
              }`}
            >
              <div>{cardName}</div>
              <div className="text-xs opacity-75">-{value}</div>
              {count > 0 && (
                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {count}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Face Cards Row (10/J/Q/K combined) */}
      <div className="mb-4">
        <div className="relative">
          <button
            onClick={() => setFaceCardMenu(faceCardMenu ? null : true)}
            disabled={hasJoker}
            className={`w-full py-4 px-4 rounded font-bold transition-all ${
              hasJoker
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-500 hover:bg-indigo-600 text-white active:scale-95'
            }`}
          >
            <div>10 / J / Q / K</div>
            <div className="text-sm opacity-75">-10 (Semua nilai sama)</div>
            {Object.values(cardCounts)
              .reduce((sum, count) => sum + count, 0) > 0 && (
              <div className="text-xs mt-1">
                Total selected: {Object.values(cardCounts)
                  .reduce((sum, count) => sum + count, 0)}
              </div>
            )}
          </button>

          {/* Face Card Menu */}
          {faceCardMenu && !hasJoker && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-indigo-300 rounded-lg p-3 shadow-lg z-10">
              <div className="grid grid-cols-4 gap-2">
                {faceCards.map(card => {
                  const count = cardCounts[card] || 0;
                  return (
                    <button
                      key={card}
                      onClick={() => handleFaceCardTap(card)}
                      className="bg-indigo-100 hover:bg-indigo-200 text-indigo-900 font-bold py-2 px-2 rounded text-sm transition-all relative"
                    >
                      {card}
                      {count > 0 && (
                        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                          {count}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Joker Row */}
      <div className="mb-6">
        {selectedJokers >= maxJokers && maxJokers < 4 && (
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-2 mb-3 text-center">
            <p className="text-xs text-red-900 font-semibold">
              🚫 Limit joker tercapai! ({selectedJokers}/{maxJokers})
            </p>
          </div>
        )}
        
        <button
          onClick={handleJokerTap}
          disabled={selectedJokers >= maxJokers}
          className={`relative w-full font-bold py-4 px-4 rounded transition-all ${
            selectedJokers >= maxJokers
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-purple-500 hover:bg-purple-600 text-white active:scale-95'
          }`}
        >
          <div>🃏 JOKER</div>
          <div className="text-sm opacity-75">
            -100 per kartu {selectedJokers >= maxJokers ? '(limit)' : `(sisa: ${maxJokers - selectedJokers})`}
          </div>
          {selectedJokers > 0 && (
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-sm rounded-full w-8 h-8 flex items-center justify-center font-bold">
              {selectedJokers}
            </div>
          )}
        </button>
      </div>

      {/* Selected Cards Summary */}
      {(hasCards || hasJoker) && (
        <div className="bg-gray-100 p-3 rounded mb-4 text-sm">
          <div className="font-semibold mb-2">Kartu yang dipilih:</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(cardCounts)
              .filter(([_, count]) => count > 0)
              .map(([cardName, count]) => (
                <span
                  key={cardName}
                  className="bg-blue-200 px-2 py-1 rounded text-xs cursor-pointer hover:bg-blue-300"
                  onClick={() => handleCardRemove(cardName)}
                  title="Click untuk kurangi"
                >
                  {cardName}×{count}
                </span>
              ))}
            {selectedJokers > 0 && (
              <span
                className="bg-purple-200 px-2 py-1 rounded text-xs cursor-pointer hover:bg-purple-300"
                onClick={handleJokerRemove}
                title="Click untuk kurangi"
              >
                🃏 JOKER×{selectedJokers}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Total */}
      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-4 text-center">
        <div className="text-sm text-gray-600">Total Minus</div>
        <div className="text-3xl font-bold text-red-600">-{totalMinus}</div>
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleReset}
          className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded transition-colors"
        >
          Reset
        </button>
        <button
          onClick={handleSave}
          className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition-colors"
        >
          Simpan ✓
        </button>
      </div>
    </div>
  );
}

