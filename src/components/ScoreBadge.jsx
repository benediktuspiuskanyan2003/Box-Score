import React from 'react';

/**
 * Badge untuk menampilkan skor dengan warna berbeda
 * Positif = hijau, Negatif = merah
 */
export function ScoreBadge({ score, size = 'md' }) {
  const isPositive = score > 0;
  const isZero = score === 0;

  const sizeClasses = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-3 py-2 text-base',
    lg: 'px-4 py-3 text-lg font-bold'
  };

  const colorClasses = isZero 
    ? 'bg-gray-100 text-gray-800' 
    : isPositive 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800';

  return (
    <span className={`rounded-md font-semibold ${sizeClasses[size]} ${colorClasses}`}>
      {isPositive && '+'}
      {score}
    </span>
  );
}
