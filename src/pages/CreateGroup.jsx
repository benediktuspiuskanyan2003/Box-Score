import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGroup } from '../hooks/useGroup';
import { MINUS_LIMITS } from '../utils/constants';

/**
 * Halaman untuk membuat grup baru
 */
export function CreateGroup() {
  const navigate = useNavigate();
  const { createGroup, loading, error } = useGroup();

  const [groupName, setGroupName] = useState('');
  const [minusLimit, setMinusLimit] = useState(-300);
  const [playerCount, setPlayerCount] = useState(4);
  const [playerNames, setPlayerNames] = useState(Array(4).fill(''));
  const [customLimit, setCustomLimit] = useState('');

  const handlePlayerCountChange = (count) => {
    setPlayerCount(count);
    setPlayerNames(Array(count).fill('').slice(0, count).concat(playerNames.slice(0, count)));
  };

  const handlePlayerNameChange = (index, value) => {
    const newNames = [...playerNames];
    newNames[index] = value;
    setPlayerNames(newNames);
  };

  const handleMinusLimitChange = (value) => {
    if (value === 'custom') {
      setMinusLimit(parseInt(customLimit) || -300);
    } else {
      setMinusLimit(parseInt(value));
      setCustomLimit('');
    }
  };

  const handleCustomLimitChange = (value) => {
    setCustomLimit(value);
    setMinusLimit(parseInt(value) || -300);
  };

  const handleSubmit = async () => {
    // Validation
    if (!groupName.trim()) {
      alert('Nama grup tidak boleh kosong');
      return;
    }

    const validNames = playerNames.slice(0, playerCount).filter(name => name.trim());
    if (validNames.length < playerCount) {
      alert(`Semua ${playerCount} pemain harus memiliki nama`);
      return;
    }

    // Create group
    const result = await createGroup(groupName, minusLimit, validNames);

    if (result) {
      // Go to group code page
      navigate(`/group/${result.group.code}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-20">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 font-semibold mb-4"
          >
            ← Kembali
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Buat Grup Baru</h1>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            Error: {error}
          </div>
        )}

        {/* Group Name */}
        <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Nama Grup
          </label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Misal: Geng Pontianak"
            className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Minus Limit */}
        <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Batas Minus (Reset Skor)
          </label>
          <div className="space-y-2">
            {MINUS_LIMITS.map(limit => (
              <label key={limit} className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="minusLimit"
                  value={limit}
                  checked={minusLimit === limit}
                  onChange={(e) => handleMinusLimitChange(e.target.value)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="ml-3 text-gray-700 font-medium">{limit}</span>
              </label>
            ))}
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="minusLimit"
                value="custom"
                checked={!MINUS_LIMITS.includes(minusLimit) && minusLimit !== -300}
                onChange={(e) => {
                  if (e.target.checked) {
                    handleMinusLimitChange('custom');
                  }
                }}
                className="w-4 h-4 text-blue-600"
              />
              <span className="ml-3 text-gray-700 font-medium">Custom:</span>
              <input
                type="number"
                value={customLimit}
                onChange={(e) => handleCustomLimitChange(e.target.value)}
                placeholder="-500"
                className="ml-2 border border-gray-300 rounded px-2 py-1 w-32"
              />
            </label>
          </div>
        </div>

        {/* Player Count */}
        <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Jumlah Pemain
          </label>
          <div className="flex gap-4">
            {[4, 5].map(count => (
              <button
                key={count}
                onClick={() => handlePlayerCountChange(count)}
                className={`flex-1 py-2 px-4 rounded-lg font-bold transition-all ${
                  playerCount === count
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {count} Pemain
              </button>
            ))}
          </div>
        </div>

        {/* Player Names */}
        <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Nama Pemain
          </label>
          <div className="space-y-2">
            {Array(playerCount)
              .fill(null)
              .map((_, index) => (
                <input
                  key={index}
                  type="text"
                  value={playerNames[index] || ''}
                  onChange={(e) => handlePlayerNameChange(index, e.target.value)}
                  placeholder={`Pemain ${index + 1}`}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                />
              ))}
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-all"
        >
          {loading ? 'Membuat...' : '✓ Buat Grup'}
        </button>
      </div>
    </div>
  );
}

