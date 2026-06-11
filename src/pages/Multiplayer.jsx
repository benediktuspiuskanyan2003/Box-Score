import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export function Multiplayer() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateRoom = async () => {
    setLoading(true);
    try {
      // Generate kode unik
      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      // Buat room di DB dengan creator_id = user ini
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({ room_code: roomCode, creator_id: userProfile.id })
        .select()
        .single();

      if (roomError) throw roomError;

      // Otomatis masukkan creator ke room_players
      const { error: playerError } = await supabase
        .from('room_players')
        .insert({ room_id: room.id, user_id: userProfile.id, is_ready: true });

      if (playerError) throw playerError;

      // Navigate dengan flag sebagai creator
      navigate(`/waiting-room/${roomCode}`, { state: { isCreator: true } });

    } catch (err) {
      toast.error('Gagal membuat room');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!joinCode.trim()) {
      toast.error('Masukkan kode room terlebih dahulu');
      return;
    }
    setLoading(true);
    try {
      // Cari room berdasarkan kode
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('room_code', joinCode.toUpperCase())
        .eq('status', 'waiting')
        .single();

      if (roomError || !room) {
        toast.error('Room tidak ditemukan atau sudah mulai');
        return;
      }

      // Cek jumlah pemain
      const { count } = await supabase
        .from('room_players')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', room.id);

      if (count >= 5) {
        toast.error('Room sudah penuh (maksimal 5 pemain)');
        return;
      }

      // Masukkan user ke room_players
      const { error: playerError } = await supabase
        .from('room_players')
        .insert({ room_id: room.id, user_id: userProfile.id, is_ready: false });

      if (playerError) {
        // Kalau sudah ada (misal refresh), abaikan
        if (playerError.code !== '23505') throw playerError;
      }

      navigate(`/waiting-room/${joinCode.toUpperCase()}`, { state: { isCreator: false } });

    } catch (err) {
      toast.error('Gagal bergabung ke room');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
      <div className="max-w-md mx-auto">
        <button
          onClick={() => navigate('/home')}
          className="mb-6 text-white font-bold text-lg flex items-center gap-2 hover:gap-3 transition-all"
        >
          ← Kembali
        </button>

        <div className="space-y-6">
          <div className="text-center">
            <div className="text-6xl mb-3">👥</div>
            <h1 className="text-3xl font-black text-white">BERMAIN ONLINE</h1>
            <p className="text-white/90 mt-2">Mainkan bersama teman</p>
          </div>

          {/* Join Room */}
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

          <div className="flex items-center gap-3 px-4">
            <div className="flex-1 h-0.5 bg-white/30"></div>
            <div className="text-white font-bold">ATAU</div>
            <div className="flex-1 h-0.5 bg-white/30"></div>
          </div>

          {/* Create Room */}
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

          <div className="bg-white/20 backdrop-blur rounded-2xl p-4 text-white text-sm text-center">
            <div>Minimal 4 pemain, maksimal 5 pemain</div>
            <div>Semua pemain harus siap sebelum bermain</div>
          </div>
        </div>
      </div>
    </div>
  );
}