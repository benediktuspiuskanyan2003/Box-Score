import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { initializeGame } from '../engine/gameEngine';

export function WaitingRoom() {
  const navigate = useNavigate();
  const { roomCode } = useParams();
  const { state } = useLocation();
  const { userProfile } = useAuth();

  const isCreator = state?.isCreator ?? false; // ✅ dari navigate state, bukan random

  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [isReady, setIsReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bots, setBots] = useState([]);

  const totalPlayers = players.length + bots.length;
  const allReady = totalPlayers >= 4 && players.every(p => 
    p.user_id === room?.creator_id || p.is_ready
  );
  const playersRef = React.useRef(players);
  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  // ── Ambil data room & pemain awal ──────────────────────────────
  useEffect(() => {
    const fetchRoom = async () => {
      const { data: roomData } = await supabase
        .from('rooms')
        .select('*')
        .eq('room_code', roomCode)
        .single();

      setRoom(roomData);
      setBots(roomData.bots || []);

      const { data: playersData } = await supabase
        .from('room_players')
        .select(`
          *,
          users(id, display_name, profile_picture_url)
        `)
        .eq('room_id', roomData.id);

      setPlayers(playersData || []);
      setLoading(false);
    };

    fetchRoom();
  }, [roomCode]);

  // ── Realtime subscription ──────────────────────────────────────
  useEffect(() => {
    if (!room?.id) return;

    const channel = supabase
      .channel(`room:${room.id}`)
      // Pantau perubahan pemain (join, ready, leave)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'room_players',
        filter: `room_id=eq.${room.id}`
      }, async () => {
        // Refresh daftar pemain setiap ada perubahan
        const { data } = await supabase
          .from('room_players')
          .select(`*, users(id, display_name, profile_picture_url)`)
          .eq('room_id', room.id);

        setPlayers(data || []);
      })
      // Pantau status room (mulai game)
      
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${room.id}`
      }, (payload) => {
        setBots(payload.new.bots || []);
        // Di realtime subscription rooms UPDATE
      if (payload.new.status === 'playing') {
        navigate(`/play/game/${room.id}`);
      }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [room?.id, navigate]);

  // ── Keluar dari room ───────────────────────────────────────────
  const handleLeave = async () => {
    await supabase
      .from('room_players')
      .delete()
      .eq('room_id', room.id)
      .eq('user_id', userProfile.id);

    // Kalau creator keluar, hapus room
    if (isCreator) {
      await supabase.from('rooms').delete().eq('id', room.id);
    }

    navigate('/home');
  };

  // ── Toggle siap (hanya untuk tamu) ────────────────────────────
  const handleReady = async () => {
    const newReady = !isReady;
    setIsReady(newReady);

    await supabase
      .from('room_players')
      .update({ is_ready: newReady })
      .eq('room_id', room.id)
      .eq('user_id', userProfile.id);
  };

  const handleAddBot = async () => {
  const botCount = bots.length + 1;
  if (players.length + bots.length >= 5) return;
  
  const newBots = [...bots, {
    id: `bot_${botCount}`,
    name: `Bot ${botCount}`,
    isBot: true,
  }];
  
  setBots(newBots);
  await supabase.from('rooms').update({ bots: newBots }).eq('id', room.id);
};

const handleRemoveBot = async (botId) => {
  const newBots = bots.filter(b => b.id !== botId);
  setBots(newBots);
  await supabase.from('rooms').update({ bots: newBots }).eq('id', room.id);
};

  // ── Mulai permainan (hanya creator) ───────────────────────────
  const handleStartGame = async () => {
  console.log('allReady:', allReady);
  console.log('players:', players);
  console.log('bots:', bots);
  console.log('totalPlayers:', totalPlayers);
  if (!allReady) {
    console.log('BLOCKED: allReady false');
    return;
  }

  const humanPlayers = playersRef.current.map(p => ({
  id: p.user_id,
  name: p.users?.display_name || 'Unknown',
  isBot: false,
  profilePicture: p.users?.profile_picture_url || null,
  }));

  const botPlayers = bots.map(bot => ({
  id: bot.id,
  name: bot.name,
  isBot: true,
  }));

  const allPlayers = [...humanPlayers, ...botPlayers];
  console.log('allPlayers:', allPlayers); // ← tambah
  
  const initialGameState = initializeGame(allPlayers, -300, room.id);
  console.log('initialGameState:', initialGameState); // ← tambah

  // Simpan ke Supabase
  const { data: session, error } = await supabase
    .from('game_sessions')
    .insert({
      room_id: room.id,
      game_state: initialGameState
    })
    .select()
    .single();

   console.log('session:', session); // ← tambah
  console.log('error:', error);     // ← tambah
  if (error) {
    toast.error('Gagal memulai game');
    console.error(error);
    return;
  }

  const { error: updateError } = await supabase
    .from('rooms')
    .update({ status: 'playing' })
    .eq('id', room.id);
  
  console.log('updateError:', updateError); // ← tambah

  // Update status room → trigger redirect semua pemain
  await supabase
    .from('rooms')
    .update({ status: 'playing' })
    .eq('id', room.id);
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
        <div className="text-white text-xl font-bold">⏳ Memuat room...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
      <div className="max-w-md mx-auto">
        {/* Back / Keluar */}
        <button
          onClick={handleLeave}
          className="mb-4 text-white font-bold text-lg flex items-center gap-2 hover:gap-3 transition-all"
        >
          ← {isCreator ? 'Bubarkan Room' : 'Keluar Room'}
        </button>

        {/* Room Code */}
        <div className="bg-white/20 backdrop-blur rounded-2xl p-4 mb-6 border-2 border-white/40">
          <div className="text-white text-center">
            <div className="text-sm font-semibold opacity-90">Kode Room</div>
            <div className="text-3xl font-black tracking-widest mb-3 font-mono">{roomCode}</div>
            <button
              onClick={copyRoomCode}
              className="text-sm bg-white/30 hover:bg-white/50 px-3 py-1 rounded-full transition-all"
            >
              {copied ? '✓ Copied' : '📋 Salin Kode'}
            </button>
          </div>
        </div>

        {/* Player List */}
        <div className="bg-white rounded-3xl p-6 shadow-xl mb-6">
          <h2 className="font-bold text-slate-800 mb-4 text-center">
            👥 Pemain ({totalPlayers}/5)
          </h2>

          <div className="space-y-3 mb-6">
            {players.map((player) => {
              const isMe = player.user_id === userProfile?.id;
              const name = player.users?.display_name || 'Unknown';
              const avatar = name.charAt(0).toUpperCase();
              const isHost = player.user_id === room?.creator_id;
              const profilePictureUrl = player.users?.profile_picture_url;

              return (
                <div
                  key={player.id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    player.is_ready ? 'bg-green-50 border-green-400' : 'bg-slate-50 border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar - Show profile picture if available, otherwise show initial */}
                    {profilePictureUrl ? (
                      <img
                        src={`${profilePictureUrl}?t=${Date.now()}`}
                        alt={name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-white shadow"
                      />
                    ) : (
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-lg ${
                        isHost
                          ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
                          : 'bg-gradient-to-br from-blue-400 to-purple-500'
                      }`}>
                        {avatar}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-bold text-slate-800">
                        {name} {isHost && '👑'} {isMe && <span className="text-xs text-slate-400">(Kamu)</span>}
                      </div>
                      <div className="text-xs text-slate-600">
                        {isHost ? '✓ Tuan Rumah' : player.is_ready ? '✓ Siap' : '⏳ Menunggu'}
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm ${
                      player.is_ready ? 'bg-green-500 text-white' : 'bg-slate-300 text-slate-600'
                    }`}>
                      {player.is_ready ? '✓' : '○'}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Bot List */}
            {bots.map(bot => (
              <div key={bot.id} className="p-4 rounded-lg border-2 bg-slate-50 border-slate-300">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-lg bg-gradient-to-br from-gray-500 to-gray-700">
                    🤖
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-800">{bot.name}</div>
                    <div className="text-xs text-slate-600">🤖 Bot (Hard)</div>
                  </div>
                  {isCreator && (
                    <button
                      onClick={() => handleRemoveBot(bot.id)}
                      className="text-red-500 text-xs font-bold"
                    >✕ Hapus</button>
                  )}
                </div>
              </div>
            ))}

            {/* Tombol tambah bot — hanya creator, max 5 total */}
            {isCreator && players.length + bots.length < 5 && (
              <button
                onClick={handleAddBot}
                className="w-full border-2 border-dashed border-slate-300 text-slate-500 font-bold py-3 rounded-lg hover:border-purple-400 hover:text-purple-500 transition-all"
              >
                🤖 + Tambah Bot
              </button>
            )}
          </div>

          {/* Status warnings */}
          {totalPlayers < 4 && (
            <div className="mb-4 p-3 bg-yellow-50 border-2 border-yellow-300 rounded-lg text-center text-sm text-yellow-800 font-semibold">
              ⚠️ Minimal 4 pemain untuk mulai ({totalPlayers}/4)
            </div>
          )}
          {totalPlayers >= 4 && !allReady && (
            <div className="mb-4 p-3 bg-blue-50 border-2 border-blue-300 rounded-lg text-center text-sm text-blue-800 font-semibold">
              ⏳ Menunggu semua pemain siap...
            </div>
          )}
          {allReady && (
            <div className="mb-4 p-3 bg-green-50 border-2 border-green-300 rounded-lg text-center text-sm text-green-800 font-semibold">
              ✅ Semua pemain siap! Tuan rumah bisa mulai.
            </div>
          )}

          {/* Action button */}
          {isCreator ? (
            <button
              onClick={handleStartGame}
              disabled={!allReady}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-all"
            >
              ▶ MULAI PERMAINAN
            </button>
          ) : (
            <button
              onClick={handleReady}
              className={`w-full font-bold py-3 rounded-lg transition-all ${
                isReady
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {isReady ? '❌ BATALKAN SIAP' : '✅ SIAP'}
            </button>
          )}
        </div>

        <div className="bg-white/20 backdrop-blur rounded-2xl p-4 text-white text-center text-sm">
          Bagikan kode room ke teman untuk bergabung
        </div>
      </div>
    </div>
  );
}