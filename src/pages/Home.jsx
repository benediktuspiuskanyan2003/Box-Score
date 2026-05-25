import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGroup } from '../hooks/useGroup';

/**
 * Halaman utama - pilih buat grup baru atau gabung grup
 */
export function Home() {
  const navigate = useNavigate();
  const { getLastGroup } = useGroup();
  const [lastGroupCode, setLastGroupCode] = React.useState(null);

  useEffect(() => {
    // Check if there's a last group
    const code = localStorage.getItem('lastGroupCode');
    if (code) {
      setLastGroupCode(code);
    }
  }, []);

  const handleContinueLastGroup = () => {
    if (lastGroupCode) {
      navigate(`/game/${lastGroupCode}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 right-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl"></div>
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo / Title */}
        <div className="text-center mb-12">
          {/* Animated joker logo */}
          <div className="mb-6 transform hover:scale-110 transition-transform duration-300">
            <div className="text-9xl animate-bounce" style={{animationDuration: '3s'}}>🃏</div>
          </div>
          
          <h1 className="text-5xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent mb-3">
            JOKER SCORE
          </h1>
          <p className="text-purple-200 text-lg font-semibold">Pencatat Skor Permainan Kartu</p>
          <p className="text-purple-300 text-sm mt-2">Mainkan dengan strategi, menang dengan perhitungan</p>
        </div>

        {/* Last Group Button */}
        {lastGroupCode && (
          <button
            onClick={handleContinueLastGroup}
            className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold py-5 px-6 rounded-xl mb-4 transition-all transform hover:scale-105 hover:-translate-y-1 shadow-2xl border border-purple-400/30"
          >
            <div className="text-sm opacity-90">↩️ Lanjutkan Grup</div>
            <div className="text-2xl font-black tracking-wider">{lastGroupCode}</div>
          </button>
        )}

        {/* Create Group Button */}
        <button
          onClick={() => navigate('/create')}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-bold py-5 px-6 rounded-xl mb-3 transition-all transform hover:scale-105 hover:-translate-y-1 shadow-xl border border-blue-400/30 text-lg"
        >
          ✨ Buat Grup Baru
        </button>

        {/* Join Group Button */}
        <button
          onClick={() => navigate('/join')}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold py-5 px-6 rounded-xl mb-3 transition-all transform hover:scale-105 hover:-translate-y-1 shadow-xl border border-emerald-400/30 text-lg"
        >
          👥 Gabung Grup
        </button>

        {/* My Groups Button */}
        <button
          onClick={() => navigate('/mygroups')}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold py-5 px-6 rounded-xl mb-3 transition-all transform hover:scale-105 hover:-translate-y-1 shadow-xl border border-amber-400/30 text-lg"
        >
          📂 Kelola Grup
        </button>

        {/* Rules Button */}
        <button
          onClick={() => navigate('/rules')}
          className="w-full bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 hover:-translate-y-1 shadow-lg border border-slate-600/30"
        >
          📖 Aturan Permainan
        </button>
      </div>

      {/* Footer */}
      <div className="fixed bottom-4 text-center text-xs text-purple-300 w-full z-0">
        <p className="font-semibold">🎴 Joker Score Tracker v1.0</p>
      </div>
    </div>
  );
}
