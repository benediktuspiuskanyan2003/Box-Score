import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function Multiplayer() {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoinRoom = async () => {
    if (!joinCode.trim()) {
      alert('Masukkan kode room terlebih dahulu');
      return;
    }
    setLoading(true);
    try {
      // TODO: Join room logic
      navigate(`/waiting-room/${joinCode.toUpperCase()}`);
    } catch (err) {
      console.error('Error joining room:', err);
      alert('Gagal bergabung ke room');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async () => {
    setLoading(true);
    try {
      // TODO: Create room logic - generate room code
      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      navigate(`/waiting-room/${roomCode}`);
    } catch (err) {
      console.error('Error creating room:', err);
      alert('Gagal membuat room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
      <div className="max-w-md mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/home')}
          className="mb-6 text-white font-bold text-lg flex items-center gap-2 hover:gap-3 transition-all"
        >
          ← Kembali
        </button>

        <div className="space-y-6">
          {/* Title */}
          <div className="text-center">
            <div className="text-6xl mb-3">👥</div>
            <h1 className="text-3xl font-black text-white">BERMAIN ONLINE</h1>
            <p className="text-white/90 mt-2">Mainkan bersama teman</p>
          </div>

          {/* Join Room Section */}
          <div className="bg-white rounded-3xl p-6 shadow-xl">
            <div className="text-lg font-bold text-slate-800 mb-4">🔓 Gabung Room</div>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Masukkan kode room"
              maxLength="6"
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-purple-500 focus:outline-none text-center text-2xl font-bold tracking-widest mb-4"
            />
            <button
              onClick={handleJoinRoom}
              disabled={loading || !joinCode.trim()}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all"
            >
              {loading ? '⏳ Bergabung...' : '🔓 GABUNG'}
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 px-4">
            <div className="flex-1 h-0.5 bg-white/30"></div>
            <div className="text-white font-bold">ATAU</div>
            <div className="flex-1 h-0.5 bg-white/30"></div>
          </div>

          {/* Create Room Section */}
          <div className="bg-white rounded-3xl p-6 shadow-xl">
            <div className="text-lg font-bold text-slate-800 mb-4">🔐 Buka Room Baru</div>
            <p className="text-sm text-slate-600 mb-4">Buat room baru dan bagikan kode ke teman</p>
            <button
              onClick={handleCreateRoom}
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all"
            >
              {loading ? '⏳ Membuat...' : '🔐 BUKA ROOM BARU'}
            </button>
          </div>

          {/* Info */}
          <div className="bg-white/20 backdrop-blur rounded-2xl p-4 text-white text-sm text-center">
            <div>Minimal 4 pemain, maksimal 5 pemain</div>
            <div>Semua pemain harus siap sebelum bermain</div>
          </div>
        </div>
      </div>
    </div>
  );
}
