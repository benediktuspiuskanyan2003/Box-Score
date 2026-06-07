import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGroup } from '../hooks/useGroup';

/**
 * Halaman untuk bergabung dengan grup menggunakan kode
 */
export function JoinGroup() {
  const navigate = useNavigate();
  const { fetchGroup, loading, error } = useGroup();

  const [code, setCode] = useState('');
  const [localError, setLocalError] = useState(null);

  const handleCodeChange = (e) => {
    // Auto uppercase
    setCode(e.target.value.toUpperCase());
    setLocalError(null);
  };

  const handleSubmit = async () => {
    if (!code.trim()) {
      setLocalError('Kode grup tidak boleh kosong');
      return;
    }

    if (code.length !== 6) {
      setLocalError('Kode harus 6 karakter');
      return;
    }

    const result = await fetchGroup(code);

    if (result) {
      navigate(`/game/${code}`);
    } else {
      setLocalError('Kode tidak ditemukan atau grup sudah dihapus');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-20 flex flex-col items-center justify-center">
      <div className="w-full max-w-md">
        {/* Header */}
        <button
          onClick={() => navigate('/')}
          className="text-blue-600 font-semibold mb-6"
        >
          ← Kembali
        </button>

        <div className="text-center mb-8">
          <div className="text-5xl mb-2">🤝</div>
          <h1 className="text-3xl font-bold text-gray-900">Gabung Grup</h1>
          <p className="text-gray-600 mt-2">Masukkan kode 6 karakter dari pembuat grup</p>
        </div>

        {/* Error Message */}
        {(localError || error) && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {localError || error}
          </div>
        )}

        {/* Code Input */}
        <div className="bg-white rounded-lg p-6 shadow-md mb-4">
          <input
            type="text"
            value={code}
            onChange={handleCodeChange}
            onKeyPress={handleKeyPress}
            maxLength="6"
            placeholder="Misal: GENG01"
            className="w-full text-center text-3xl font-bold letter-spacing tracking-widest border-2 border-gray-300 rounded-lg px-4 py-4 focus:border-green-500 focus:outline-none"
          />
          <p className="text-center text-xs text-gray-500 mt-2">
            Tik 6 karakter (huruf dan angka)
          </p>
        </div>

        {/* Join Button */}
        <button
          onClick={handleSubmit}
          disabled={loading || code.length !== 6}
          className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-lg transition-all text-lg mb-3"
        >
          {loading ? '⏳ Mencari...' : '→ Gabung'}
        </button>

        {/* Info Box */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
          <p className="text-sm text-blue-900">
            💡 <span className="font-semibold">Tip:</span> Minta kode 6 karakter dari pemain yang membuat grup
          </p>
        </div>
      </div>
    </div>
  );
}

