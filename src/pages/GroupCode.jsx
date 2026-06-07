import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGroup } from '../hooks/useGroup';
import { useEffect, useState } from 'react';

/**
 * Halaman setelah membuat grup - tampilkan kode dan daftar pemain
 */
export function GroupCode() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { group, players, fetchGroup, loading } = useGroup();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!group) {
      fetchGroup(code);
    }
  }, [code, group, fetchGroup]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartGame = () => {
    navigate(`/game/${code}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Memuat...</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-600">Grup tidak ditemukan</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4 pb-20">
      <div className="max-w-md mx-auto">
        {/* Success Icon */}
        <div className="text-center mb-8 pt-8">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Grup Dibuat!</h1>
          <p className="text-gray-600">{group.name}</p>
        </div>

        {/* Code Box */}
        <div className="bg-white rounded-xl p-6 shadow-lg mb-6">
          <p className="text-center text-sm text-gray-600 mb-3">Bagikan kode ini ke pemain lain:</p>
          <button
            onClick={handleCopyCode}
            className="w-full bg-blue-50 hover:bg-blue-100 border-2 border-blue-300 rounded-lg p-6 transition-all mb-2"
          >
            <p className="text-4xl font-bold text-blue-600 tracking-widest mb-1">{code}</p>
            <p className="text-xs text-blue-600">
              {copied ? '✓ Disalin ke clipboard' : 'Tap untuk salin'}
            </p>
          </button>
        </div>

        {/* Group Info */}
        <div className="bg-white rounded-lg p-4 shadow-md mb-4">
          <h3 className="font-bold text-gray-900 mb-3">⚙️ Pengaturan Grup</h3>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex justify-between">
              <span>Nama Grup:</span>
              <span className="font-semibold">{group.name}</span>
            </div>
            <div className="flex justify-between">
              <span>Batas Minus:</span>
              <span className="font-semibold">{group.minus_limit}</span>
            </div>
            <div className="flex justify-between">
              <span>Jumlah Pemain:</span>
              <span className="font-semibold">{players.length}</span>
            </div>
          </div>
        </div>

        {/* Players List */}
        <div className="bg-white rounded-lg p-4 shadow-md mb-6">
          <h3 className="font-bold text-gray-900 mb-3">👥 Daftar Pemain</h3>
          <div className="space-y-2">
            {players.map((player, index) => (
              <div key={player.id} className="flex items-center p-2 bg-gray-50 rounded">
                <span className="text-gray-500 font-semibold w-6">{index + 1}.</span>
                <span className="flex-1">{player.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Start Game Button */}
        <button
          onClick={handleStartGame}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-lg transition-all transform hover:scale-105 shadow-lg text-lg mb-3"
        >
          🎮 Mulai Permainan
        </button>

        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="w-full bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-lg transition-all"
        >
          Kembali
        </button>
      </div>
    </div>
  );
}

