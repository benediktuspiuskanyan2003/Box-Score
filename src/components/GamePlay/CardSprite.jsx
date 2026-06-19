/**
 * CardSprite.jsx
 * Komponen render satu kartu menggunakan SVG sprite dari htdebeer/SVG-cards
 *
 * Props:
 * - card       : objek kartu { rank, suit, isJoker, label }
 * - faceDown   : boolean, tampilkan kartu belakang
 * - width      : lebar kartu dalam px (default 56)
 * - selected   : boolean, kartu dipilih (naik sedikit + highlight)
 * - valid      : boolean, kartu bisa dimainkan (highlight hijau)
 * - onClick    : handler klik
 * - className  : class tambahan
 * - jokerIndex : 0/1 untuk warna joker
 */

import React from 'react';
import { SVG_CARDS_URL, CARD_BACK_URL, CARD_ASPECT, getCardSvgId } from '../../utils/cardMapper';

export function CardSprite({
  card,
  faceDown = false,
  width = 56,
  selected = false,
  valid = false,
  onClick,
  className = '',
  jokerIndex = 0,
  style = {},
}) {
  const height = Math.round(width * CARD_ASPECT);

  const svgId = faceDown
    ? 'alternate-back'
    : getCardSvgId(card, jokerIndex);

  const href = `${SVG_CARDS_URL}#${svgId}`;

  return (
    <div
      onClick={onClick}
      className={`relative inline-block transition-all duration-150 select-none
        ${onClick ? 'cursor-pointer' : ''}
        ${selected ? 'drop-shadow-[0_0_8px_rgba(250,204,21,0.9)]' : ''}
        
        ${className}
      `}
      style={{ width, height, ...style }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 169.075 244.64`}
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
      >
        <use href={href} x="0" y="0" />
      </svg>

      {/* Overlay ring saat selected */}
      {selected && (
        <div className="absolute inset-0 rounded-md ring-2 ring-yellow-400 pointer-events-none" />
      )}

      {/* Overlay valid — hijau tipis di dalam kartu */}
      {valid && !selected && (
        <div className="absolute inset-0 rounded-md ring-2 ring-green-400 bg-green-400/15 pointer-events-none" />
      )}
    </div>
  );
}
