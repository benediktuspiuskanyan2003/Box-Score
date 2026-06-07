import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function WaitingRoom() {
  const navigate = useNavigate();
  const { roomCode } = useParams();
  const { userProfile } = useAuth();
  const [players, setPlayers] = useState([]);
  const [isCreator, setIsCreator] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [allReady, setAllReady] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Simulate joining room
    const currentPlayer = {
      id: userProfile?.id,
      name: userProfile?.display_name,
      avatar: userProfile?.display_name?.charAt(0).toUpperCase(),
      ready: false,
      isCreator: Math.random() > 0.5 // Random for demo
    };
    
    setIsCreator(currentPlayer.isCreator);
    
    // Simulate other players
    const otherPlayers = [
      { id: 1, name: 'Player 1', avatar: 'P', ready: false, isCreator: false },
      { id: 2, name: 'Player 2', avatar: 'P', ready: true, isCreator: false }
    ];

    setPlayers([currentPlayer, ...otherPlayers]);
  }, [userProfile]);

  const handleReady = () => {
    setIsReady(!isReady);
    const newPlayers = players.map(p => 
      p.id === userProfile?.id ? { ...p, ready: !isReady } : p
    );
    setPlayers(newPlayers);
    
    // Check if all are ready
    const allPlayerReady = newPlayers.every(p => p.ready || p.isCreator);
    setAllReady(allPlayerReady);
  };

  const handleStartGame = () => {
    if (allReady && players.length >= 4 && players.length <= 5) {
      navigate('/play/game');
    }
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
      <div className="max-w-md mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/home')}
          className="mb-4 text-white font-bold text-lg flex items-center gap-2 hover:gap-3 transition-all"
        >
          ← Kembali
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
            👥 Pemain ({players.length}/5)
          </h2>

          {/* Player Cards */}
          <div className="space-y-3 mb-6">
            {players.map((player, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border-2 transition-all ${
                  player.ready
                    ? 'bg-green-50 border-green-400'
                    : 'bg-slate-50 border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-lg ${
                    player.isCreator
                      ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
                      : 'bg-gradient-to-br from-blue-400 to-purple-500'
                  }`}>
                    {player.avatar}
                  </div>

                  {/* Player Info */}
                  <div className="flex-1">
                    <div className="font-bold text-slate-800">
                      {player.name} {player.isCreator && '👑'}
                    </div>
                    <div className="text-xs text-slate-600">
                      {player.ready ? '✓ Siap' : '⏳ Menunggu'}
                    </div>
                  </div>

                  {/* Ready Badge */}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm ${
                    player.ready
                      ? 'bg-green-500 text-white'
                      : 'bg-slate-300 text-slate-600'
                  }`}>
                    {player.ready ? '✓' : '○'}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Min Players Warning */}
          {players.length < 4 && (
            <div className="mb-4 p-3 bg-yellow-50 border-2 border-yellow-300 rounded-lg text-center text-sm text-yellow-800 font-semibold">
              ⚠️ Minimal 4 pemain untuk mulai ({players.length}/4)
            </div>
          )}

          {/* Status Message */}
          {players.length >= 4 && !allReady && (
            <div className="mb-4 p-3 bg-blue-50 border-2 border-blue-300 rounded-lg text-center text-sm text-blue-800 font-semibold">
              ⏳ Menunggu semua pemain siap...
            </div>
          )}

          {players.length >= 4 && allReady && (
            <div className="mb-4 p-3 bg-green-50 border-2 border-green-300 rounded-lg text-center text-sm text-green-800 font-semibold">
              ✓ Semua pemain siap! Bisa mulai permainan
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            {isCreator ? (
              <button
                onClick={handleStartGame}
                disabled={!allReady || players.length < 4}
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
                {isReady ? '❌ BATALKAN SIAP' : '✓ SIAP'}
              </button>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="bg-white/20 backdrop-blur rounded-2xl p-4 text-white text-center text-sm">
          <div>Bagikan kode room ke teman untuk bergabung</div>
        </div>
      </div>
    </div>
  );
}
