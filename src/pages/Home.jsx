import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Home() {
  const navigate = useNavigate();
  const { user, userProfile, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Default stats if profile doesn't have them
  const stats = {
    totalGames: userProfile?.total_games_played || 0,
    totalWins: userProfile?.total_wins || 0,
    winRate: userProfile?.total_games_played ? Math.round((userProfile?.total_wins / userProfile?.total_games_played) * 100) : 0,
    bestScore: userProfile?.best_score || 0
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4 overflow-hidden relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      <div className="relative z-10 max-w-md mx-auto">
        {/* TOP BAR: Profile (Left) + Settings (Right) */}
        <div className="flex items-center justify-between mb-8">
          {/* Profile Section */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-3 bg-white/90 backdrop-blur rounded-full p-2 pr-4 hover:bg-white transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-300 to-orange-400 rounded-full flex items-center justify-center text-xl font-bold text-white border-2 border-white">
                {userProfile?.display_name?.charAt(0).toUpperCase() || '👤'}
              </div>
              <div className="text-left">
                <div className="text-xs text-slate-500 font-semibold">Welcome</div>
                <div className="text-sm font-bold text-slate-800 truncate max-w-[80px]">{userProfile?.display_name || 'Player'}</div>
              </div>
            </button>

            {/* Profile Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-2xl overflow-hidden z-50 w-72 animate-in fade-in slide-in-from-top-2">
                <div className="p-6 bg-gradient-to-r from-blue-400 to-purple-400 text-white">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-2xl font-bold text-purple-600">
                      {userProfile?.display_name?.charAt(0).toUpperCase() || '👤'}
                    </div>
                    <div>
                      <div className="font-bold text-lg">{userProfile?.display_name || 'Player'}</div>
                      <div className="text-white/80 text-sm">{user?.email}</div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <div className="bg-white/20 rounded-lg p-2 text-center">
                      <div className="text-2xl font-bold">{stats.totalGames}</div>
                      <div className="text-xs text-white/90">Permainan</div>
                    </div>
                    <div className="bg-white/20 rounded-lg p-2 text-center">
                      <div className="text-2xl font-bold">{stats.totalWins}</div>
                      <div className="text-xs text-white/90">Kemenangan</div>
                    </div>
                    <div className="bg-white/20 rounded-lg p-2 text-center">
                      <div className="text-2xl font-bold">{stats.winRate}%</div>
                      <div className="text-xs text-white/90">Win Rate</div>
                    </div>
                    <div className="bg-white/20 rounded-lg p-2 text-center">
                      <div className="text-2xl font-bold">{stats.bestScore}</div>
                      <div className="text-xs text-white/90">Best Score</div>
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <button
                    onClick={() => navigate('/edit-profile')}
                    className="w-full text-left px-4 py-3 hover:bg-slate-100 rounded-lg font-semibold text-slate-700 transition-colors"
                  >
                    ✏️ Edit Profil
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 hover:bg-red-50 rounded-lg font-semibold text-red-600 transition-colors border-t"
                  >
                    🚪 Logout
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Settings Button */}
          <button
            onClick={() => navigate('/settings')}
            className="w-12 h-12 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-xl hover:bg-white transition-all shadow-lg hover:shadow-xl transform hover:scale-110"
            title="Settings"
          >
            ⚙️
          </button>
        </div>

        {/* Main Title */}
        <div className="text-center mb-12">
          <div className="text-6xl mb-3 animate-bounce" style={{animationDuration: '2s'}}>🎮</div>
          <h1 className="text-4xl font-black text-white mb-2">BOX CARD GAME</h1>
          <p className="text-white/90 text-lg font-semibold">Mari bermain bersama!</p>
        </div>

        {/* MAIN MENU BUTTONS */}
        <div className="space-y-4 mb-8">
          {/* Box Tracker Button */}
          <button
            onClick={() => navigate('/mygroups')}
            className="w-full relative group overflow-hidden rounded-3xl p-6 transition-all transform hover:scale-105 active:scale-95 shadow-xl hover:shadow-2xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-600 group-hover:from-emerald-500 group-hover:to-teal-700 transition-all"></div>
            <div className="absolute inset-0 bg-white/20 group-hover:bg-white/30 transition-all"></div>
            <div className="relative z-10">
              <div className="text-5xl mb-2">📊</div>
              <div className="text-xl font-black text-white">BOX TRACKER</div>
              <div className="text-white/90 text-sm mt-1">Kelola grup dan hitung poin</div>
            </div>
          </button>

          {/* Bermain Bersama Teman Button */}
          <button
            onClick={() => navigate('/multiplayer')}
            className="w-full relative group overflow-hidden rounded-3xl p-6 transition-all transform hover:scale-105 active:scale-95 shadow-xl hover:shadow-2xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-red-400 to-pink-600 group-hover:from-red-500 group-hover:to-pink-700 transition-all"></div>
            <div className="absolute inset-0 bg-white/20 group-hover:bg-white/30 transition-all"></div>
            <div className="relative z-10">
              <div className="text-5xl mb-2">👥</div>
              <div className="text-xl font-black text-white">BERMAIN BERSAMA</div>
              <div className="text-white/90 text-sm mt-1">Mainkan bersama teman secara online</div>
            </div>
          </button>
        </div>

      </div>
    </div>
  );
}

