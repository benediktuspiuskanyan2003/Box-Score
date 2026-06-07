import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { 
  PlayIcon, 
  UserGroupIcon, 
  ClockIcon, 
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

export function HomePage() {
  const navigate = useNavigate();
  const { user, userProfile, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (!window.confirm('Yakin ingin logout?')) return;
    
    try {
      setIsLoggingOut(true);
      await logout();
      toast.success('Logout berhasil');
      navigate('/login');
    } catch (err) {
      toast.error('Logout gagal');
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Sample stats (dari database nanti)
  const stats = {
    gamesPlayed: userProfile?.total_games_played || 0,
    wins: userProfile?.total_wins || 0,
    winRate: userProfile?.total_games_played > 0 
      ? Math.round((userProfile?.total_wins / userProfile?.total_games_played) * 100) 
      : 0,
    bestScore: userProfile?.best_score || 0,
    totalScore: userProfile?.total_score || 0
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl sm:text-3xl">🃏</span>
            <div>
              <h1 className="text-lg sm:text-xl font-bold">BOX Card Game</h1>
              <p className="text-xs sm:text-sm text-blue-100">Online Edition</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 disabled:bg-slate-400 px-3 py-2 rounded-lg text-sm font-semibold transition"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
        
        {/* Welcome Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          
          {/* Profile Card */}
          <div className="lg:col-span-1 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-4 sm:p-6 text-white shadow-lg">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl sm:text-3xl">
                🎮
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold">{userProfile?.display_name || user?.email?.split('@')[0] || 'Player'}</h2>
                <p className="text-blue-100 text-xs sm:text-sm">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/settings')}
              className="w-full bg-white/20 hover:bg-white/30 py-2 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2"
            >
              <Cog6ToothIcon className="h-4 w-4" />
              Edit Profil
            </button>
          </div>

          {/* Stats Cards */}
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            
            {/* Games Played */}
            <div className="bg-slate-800 rounded-lg p-3 sm:p-4 border border-slate-700 hover:border-slate-600 transition">
              <p className="text-slate-400 text-xs sm:text-sm font-semibold">Games</p>
              <p className="text-2xl sm:text-3xl font-bold text-white mt-1">{stats.gamesPlayed}</p>
              <p className="text-slate-500 text-xs mt-1">dimainkan</p>
            </div>

            {/* Wins */}
            <div className="bg-slate-800 rounded-lg p-3 sm:p-4 border border-slate-700 hover:border-slate-600 transition">
              <p className="text-slate-400 text-xs sm:text-sm font-semibold">Wins</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-400 mt-1">{stats.wins}</p>
              <p className="text-slate-500 text-xs mt-1">kemenangan</p>
            </div>

            {/* Win Rate */}
            <div className="bg-slate-800 rounded-lg p-3 sm:p-4 border border-slate-700 hover:border-slate-600 transition">
              <p className="text-slate-400 text-xs sm:text-sm font-semibold">W/L Rate</p>
              <p className="text-2xl sm:text-3xl font-bold text-blue-400 mt-1">{stats.winRate}%</p>
              <p className="text-slate-500 text-xs mt-1">tingkat menang</p>
            </div>

            {/* Best Score */}
            <div className="bg-slate-800 rounded-lg p-3 sm:p-4 border border-slate-700 hover:border-slate-600 transition">
              <p className="text-slate-400 text-xs sm:text-sm font-semibold">Best Score</p>
              <p className="text-2xl sm:text-3xl font-bold text-yellow-400 mt-1">{stats.bestScore}</p>
              <p className="text-slate-500 text-xs mt-1">skor terbaik</p>
            </div>
          </div>
        </div>

        {/* Main Action Buttons - 2x2 Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          
          {/* Main Game Button */}
          <button
            onClick={() => navigate('/play/setup')}
            className="group relative bg-gradient-to-br from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 rounded-xl p-4 sm:p-6 text-white shadow-lg hover:shadow-xl transition transform hover:scale-105 overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/10 group-hover:bg-white/20 transition"></div>
            <div className="relative">
              <PlayIcon className="h-8 w-8 sm:h-10 sm:w-10 mb-2 mx-auto" />
              <h3 className="font-bold text-sm sm:text-base">Main Game</h3>
              <p className="text-xs text-yellow-100 mt-1">Mulai permainan</p>
            </div>
          </button>

          {/* Groups Button */}
          <button
            onClick={() => navigate('/groups')}
            className="group relative bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl p-4 sm:p-6 text-white shadow-lg hover:shadow-xl transition transform hover:scale-105 overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/10 group-hover:bg-white/20 transition"></div>
            <div className="relative">
              <UserGroupIcon className="h-8 w-8 sm:h-10 sm:w-10 mb-2 mx-auto" />
              <h3 className="font-bold text-sm sm:text-base">Grup</h3>
              <p className="text-xs text-blue-100 mt-1">Kelola grup</p>
            </div>
          </button>

          {/* History Button */}
          <button
            onClick={() => navigate('/history')}
            className="group relative bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-xl p-4 sm:p-6 text-white shadow-lg hover:shadow-xl transition transform hover:scale-105 overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/10 group-hover:bg-white/20 transition"></div>
            <div className="relative">
              <ClockIcon className="h-8 w-8 sm:h-10 sm:w-10 mb-2 mx-auto" />
              <h3 className="font-bold text-sm sm:text-base">History</h3>
              <p className="text-xs text-purple-100 mt-1">Riwayat permainan</p>
            </div>
          </button>

          {/* Settings Button */}
          <button
            onClick={() => navigate('/settings')}
            className="group relative bg-gradient-to-br from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 rounded-xl p-4 sm:p-6 text-white shadow-lg hover:shadow-xl transition transform hover:scale-105 overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/10 group-hover:bg-white/20 transition"></div>
            <div className="relative">
              <Cog6ToothIcon className="h-8 w-8 sm:h-10 sm:w-10 mb-2 mx-auto" />
              <h3 className="font-bold text-sm sm:text-base">Pengaturan</h3>
              <p className="text-xs text-slate-300 mt-1">Preferensi</p>
            </div>
          </button>
        </div>

        {/* Quick Stats & Leaderboard Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          
          {/* Quick Achievement */}
          <div className="bg-slate-800 rounded-xl p-4 sm:p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <SparklesIcon className="h-5 w-5 text-yellow-400" />
              <h3 className="text-lg font-bold text-white">Pencapaian</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                <span className="text-slate-300">🎯 Player Konsisten</span>
                <span className="text-xs bg-yellow-600/30 text-yellow-300 px-2 py-1 rounded">+5 poin</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                <span className="text-slate-300">🏆 Pemain Handal</span>
                <span className="text-xs bg-blue-600/30 text-blue-300 px-2 py-1 rounded">+10 poin</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                <span className="text-slate-300">⚡ Belum ada</span>
                <span className="text-xs bg-slate-600 text-slate-400 px-2 py-1 rounded">Locked</span>
              </div>
            </div>
          </div>

          {/* Recent Games */}
          <div className="bg-slate-800 rounded-xl p-4 sm:p-6 border border-slate-700">
            <h3 className="text-lg font-bold text-white mb-4">Game Terakhir</h3>
            <div className="space-y-2">
              <div className="p-3 bg-slate-700/50 rounded-lg text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">vs John, Jane, Bob</span>
                  <span className="text-green-400 font-semibold">+120 ✓</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">Hari ini, 14:30</p>
              </div>
              <div className="p-3 bg-slate-700/50 rounded-lg text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">vs Alice, Mike, Sarah</span>
                  <span className="text-red-400 font-semibold">-50 ✗</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">Kemarin, 20:15</p>
              </div>
              <div className="p-3 bg-slate-700/50 rounded-lg text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">vs Dave, Emma</span>
                  <span className="text-green-400 font-semibold">+85 ✓</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">2 hari lalu, 19:00</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/history')}
              className="w-full mt-4 text-blue-400 hover:text-blue-300 text-sm font-semibold py-2 transition"
            >
              Lihat semua →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

