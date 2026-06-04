import React from 'react';

/**
 * PlayingCard - Komponen kartu individual
 */
function PlayingCard({ card, size = 'small' }) {
  const sizeClass = size === 'large' ? 'w-16 h-24' : 'w-12 h-16';
  const textSize = size === 'large' ? 'text-lg' : 'text-xs';
  const suit = card.suit;
  const isRed = suit === '♥' || suit === '♦';
  const textColor = card.isJoker ? 'text-yellow-400' : isRed ? 'text-red-600' : 'text-black';

  return (
    <div className={`${sizeClass} bg-white border-2 border-gray-300 rounded flex items-center justify-center ${textColor} ${textSize} font-bold`}>
      {card.label === 'JOKER' ? '🃏' : (
        <>
          <div className="flex flex-col items-center">
            <span>{card.label}</span>
            <span>{suit}</span>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * CardTable - Tampil Sun & Box di meja
 */
export function CardTable({ gameState, onExtendSun, onAddToBox }) {
  if (!gameState) return null;

  const { suns = [], boxes = [] } = gameState.meja;

  return (
    <div className="bg-gradient-to-b from-green-900 to-green-800 p-4 rounded-lg min-h-64 border-2 border-green-600 overflow-x-auto">
      {/* Header */}
      <h3 className="text-white font-bold mb-4">Meja</h3>

      {/* SUN */}
      {suns.length > 0 && (
        <div className="mb-6">
          <h4 className="text-yellow-300 text-sm font-semibold mb-2">SUN</h4>
          <div className="flex gap-4 flex-wrap">
            {suns.map((sun, sunIdx) => (
              <div key={sun.id} className="bg-slate-900 p-3 rounded border-2 border-yellow-500">
                <div className="flex gap-1 mb-2">
                  {sun.cards.map((card, cardIdx) => (
                    <PlayingCard key={`${sun.id}-${cardIdx}`} card={card} size="small" />
                  ))}
                </div>
                <div className="text-xs text-gray-400">
                  {sun.cards.length} kartu
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BOX */}
      {boxes.length > 0 && (
        <div>
          <h4 className="text-blue-300 text-sm font-semibold mb-2">BOX</h4>
          <div className="flex gap-4 flex-wrap">
            {boxes.map((box, boxIdx) => (
              <div key={box.id} className="bg-slate-900 p-3 rounded border-2 border-blue-500">
                <div className="flex gap-1 mb-2">
                  {box.cards.map((card, cardIdx) => (
                    <PlayingCard key={`${box.id}-${cardIdx}`} card={card} size="small" />
                  ))}
                </div>
                <div className="text-xs text-gray-400">
                  {box.cards[0]?.label} × {box.cards.length}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {suns.length === 0 && boxes.length === 0 && (
        <div className="flex items-center justify-center h-32 text-gray-500">
          Meja kosong - tunggu pemain membuat SUN
        </div>
      )}
    </div>
  );
}
