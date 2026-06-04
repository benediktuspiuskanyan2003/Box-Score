import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGroup } from '../hooks/useGroup';
import { useGame } from '../hooks/useGame';
import { useRound } from '../hooks/useRound';
import { PlayerRow } from '../components/PlayerRow';
import { BottomNav } from '../components/BottomNav';

/**
 * Halaman utama permainan - menampilkan papan skor dan navigasi
 */
export function Game() {
  const { groupCode } = useParams();
  const navigate = useNavigate();
  const { group, players, fetchGroup, loading: groupLoading } = useGroup();
  const { game, rounds, getOrCreateGame, fetchRounds, loading: gameLoading } = useGame(group?.id);
  const { getGameStandings, loading: roundLoading } = useRound(game?.id, group?.id, players, group?.minus_limit);

  const [standings, setStandings] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Initialize group dari URL parameter
  useEffect(() => {
    const init = async () => {
      if (!group) {
        console.log('Fetching group with code:', groupCode);
        const result = await fetchGroup(groupCode);
        if (!result) {
          console.error('Group not found');
          navigate('/');
        }
      }
    };
    init();
  }, [groupCode, group, fetchGroup, navigate]);

  // Initialize game setelah group tersedia
  useEffect(() => {
    const init = async () => {
      if (group?.id && !game) {
        console.log('Creating/fetching game for group:', group.id);
        await getOrCreateGame();
      }
    };
    init();
  }, [group?.id, game, getOrCreateGame]);

  // Fetch rounds setelah game tersedia
  useEffect(() => {
    if (game?.id) {
      console.log('Fetching rounds for game:', game.id);
      fetchRounds(game.id);
    }
  }, [game?.id, fetchRounds]);

  // Auto-refresh standings saat user kembali ke halaman
  useEffect(() => {
    const handleFocus = () => {
      console.log('Page focus - refreshing standings and rounds');
      if (game?.id) {
        fetchRounds(game.id);
        setRefreshTrigger(prev => prev + 1);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [game?.id, fetchRounds]);

  // Calculate standings setiap kali rounds berubah atau refresh dipicu
  useEffect(() => {
    const loadStandings = async () => {
      if (game?.id && players.length > 0) {
        console.log('Loading standings for game:', game.id, 'Rounds:', rounds.length);
        const result = await getGameStandings(game.id);
        console.log('Standings result:', result);
        setStandings(result);
      }
    };
    loadStandings();
  }, [game?.id, rounds.length, refreshTrigger, players.length, getGameStandings]);

  const handleManualRefresh = async () => {
    if (game?.id) {
      console.log('Manual refresh - fetching rounds');
      await fetchRounds(game.id);
      setRefreshTrigger(prev => prev + 1);
    }
  };

  const isLoading = groupLoading || gameLoading || roundLoading;

  if (isLoading && !group) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl mb-3">🔄</p>
          <p className="text-purple-300 font-semibold">Memuat permainan...</p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-3xl mb-3">❌</p>
          <p className="text-red-400 font-semibold text-lg">Grup tidak ditemukan</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 pb-40 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl"></div>
      </div>
      
      <div className="max-w-2xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-4xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">{group.name}</h1>
            <button
              onClick={() => navigate('/')}
              className="text-red-400 hover:text-red-300 font-bold text-2xl transition-colors"
              title="Kembali ke menu"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-purple-300 font-semibold">
            🎴 {groupCode} • 👥 {players.length} pemain • 📉 Batas: {group.minus_limit}
          </p>
        </div>

        {/* Standings */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-2xl text-purple-300">🏆 Papan Skor</h2>
            <button
              onClick={handleManualRefresh}
              className="text-purple-400 hover:text-purple-300 font-bold text-xl transition-all transform hover:scale-125"
              title="Refresh standings"
            >
              🔄
            </button>
          </div>

          {standings.length > 0 ? (
            <div className="space-y-3">
              {standings.map((standing, index) => (
                <PlayerRow
                  key={standing.player.id}
                  playerName={`${index + 1}. ${standing.player.name}`}
                  score={standing.totalScore}
                  roundCount={standing.roundCount}
                  isHighlight={index === 0}
                />
              ))}
            </div>
          ) : rounds.length > 0 ? (
            <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-l-4 border-amber-400 p-4 rounded-lg">
              <p className="text-amber-300 font-semibold">
                ⚠️ Ada {rounds.length} ronde tapi skor tidak terload
              </p>
              <button
                onClick={handleManualRefresh}
                className="mt-3 text-amber-300 hover:text-amber-200 font-semibold transition-colors"
              >
                Coba refresh →
              </button>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-2 border-purple-400/50 rounded-lg p-6 text-center">
              <p className="mb-2 text-purple-300 font-semibold text-lg">Belum ada ronde</p>
              <p className="text-purple-400 text-sm">Mulai input ronde pertama di tombol 🃏</p>
            </div>
          )}
        </div>

        {/* Game Info */}
        <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border-l-4 border-indigo-400 p-4 rounded-lg mb-8">
          <p className="text-sm text-indigo-300 font-semibold">
            🎮 <span className="text-purple-200">Total Ronde:</span> <span className="text-2xl text-purple-300">{rounds.length}</span>
          </p>
          {rounds.length > 0 && standings.length === 0 && (
            <p className="text-xs text-yellow-300 mt-3 font-semibold">
              ℹ️ Jika skor tidak muncul, coba tekan 🔄 refresh
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/game/${groupCode}/round`)}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold py-4 px-4 rounded-xl transition-all transform hover:scale-105 hover:-translate-y-1 shadow-lg border border-emerald-400/30"
          >
            🃏 Input Ronde Baru
          </button>
          <button
            onClick={() => navigate(`/game/${groupCode}/history`)}
            className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-bold py-4 px-4 rounded-xl transition-all transform hover:scale-105 hover:-translate-y-1 shadow-lg border border-blue-400/30"
          >
            📋 Riwayat
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav groupCode={groupCode} />
    </div>
  );
}
