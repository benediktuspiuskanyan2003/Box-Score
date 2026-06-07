import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function BoxTracker() {
  const navigate = useNavigate();
  const [groupName, setGroupName] = useState('');
  const [players, setPlayers] = useState([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [gameStarted, setGameStarted] = useState(false);
  const [scores, setScores] = useState({});
  const [roundResults, setRoundResults] = useState([]);

  useEffect(() => {
    // Load from localStorage if exists
    const saved = localStorage.getItem('boxTrackerGame');
    if (saved) {
      const data = JSON.parse(saved);
      setGroupName(data.groupName);
      setPlayers(data.players);
      setGameStarted(data.gameStarted);
      setScores(data.scores || {});
      setRoundResults(data.roundResults || []);
    }
  }, []);

  const saveGame = (newGroupName, newPlayers, newGameStarted, newScores, newRoundResults) => {
    localStorage.setItem('boxTrackerGame', JSON.stringify({
      groupName: newGroupName,
      players: newPlayers,
      gameStarted: newGameStarted,
      scores: newScores,
      roundResults: newRoundResults
    }));
  };

  const addPlayer = () => {
    if (!newPlayerName.trim()) return;
    const newPlayers = [...players, newPlayerName];
    setPlayers(newPlayers);
    setNewPlayerName('');
    if (gameStarted) {
      setScores({ ...scores, [newPlayerName]: 0 });
    }
    saveGame(groupName, newPlayers, gameStarted, scores, roundResults);
  };

  const startGame = () => {
    if (players.length < 2) {
      alert('Minimal 2 pemain untuk mulai permainan');
      return;
    }
    const initialScores = {};
    players.forEach(p => {
      initialScores[p] = 0;
    });
    setScores(initialScores);
    setGameStarted(true);
    setRoundResults([]);
    saveGame(groupName, players, true, initialScores, []);
  };

  const updateScore = (player, value) => {
    const newScores = { ...scores, [player]: parseInt(value) || 0 };
    setScores(newScores);
    saveGame(groupName, players, gameStarted, newScores, roundResults);
  };

  const finishRound = () => {
    const roundData = {
      round: roundResults.length + 1,
      scores: { ...scores }
    };
    const newRoundResults = [...roundResults, roundData];
    setRoundResults(newRoundResults);
    const newScores = {};
    players.forEach(p => {
      newScores[p] = 0;
    });
    setScores(newScores);
    saveGame(groupName, players, gameStarted, newScores, newRoundResults);
  };

  const resetGame = () => {
    if (confirm('Hapus semua data permainan?')) {
      localStorage.removeItem('boxTrackerGame');
      setGroupName('');
      setPlayers([]);
      setNewPlayerName('');
      setGameStarted(false);
      setScores({});
      setRoundResults([]);
    }
  };

  if (!gameStarted && players.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
        <div className="max-w-md mx-auto">
          <button
            onClick={() => navigate('/home')}
            className="mb-6 text-white font-bold text-lg flex items-center gap-2 hover:gap-3 transition-all"
          >
            ← Kembali
          </button>

          <div className="bg-white rounded-3xl p-6 shadow-xl">
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">📊</div>
              <h1 className="text-2xl font-bold text-slate-800">BOX TRACKER</h1>
              <p className="text-slate-600 text-sm mt-2">Hitung poin permainan offline</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Permainan</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Misal: Game Kumpul Teman"
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Tambah Pemain</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addPlayer()}
                    placeholder="Nama pemain"
                    className="flex-1 px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  />
                  <button
                    onClick={addPlayer}
                    className="bg-purple-500 hover:bg-purple-600 text-white font-bold px-4 py-3 rounded-lg"
                  >
                    +
                  </button>
                </div>
              </div>

              {players.length > 0 && (
                <>
                  <div className="space-y-2">
                    {players.map((player, idx) => (
                      <div key={idx} className="bg-slate-100 p-3 rounded-lg flex justify-between items-center">
                        <span className="font-semibold text-slate-800">{player}</span>
                        <button
                          onClick={() => setPlayers(players.filter((_, i) => i !== idx))}
                          className="text-red-500 hover:text-red-700 font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={startGame}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3 rounded-lg"
                  >
                    ▶ Mulai Permainan ({players.length} pemain)
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Game in progress
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4 pb-20">
      <div className="max-w-md mx-auto">
        <button
          onClick={() => navigate('/home')}
          className="mb-4 text-white font-bold text-lg flex items-center gap-2 hover:gap-3 transition-all"
        >
          ← Kembali
        </button>

        <div className="bg-white rounded-3xl p-6 shadow-xl">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-800">{groupName}</h2>
            <p className="text-slate-600 text-sm">Ronde {roundResults.length + 1}</p>
          </div>

          <div className="space-y-3 mb-6">
            {players.map((player) => (
              <div key={player} className="bg-slate-50 p-4 rounded-lg border-2 border-slate-200">
                <div className="text-sm font-semibold text-slate-600 mb-1">{player}</div>
                <input
                  type="number"
                  value={scores[player] || 0}
                  onChange={(e) => updateScore(player, e.target.value)}
                  className="w-full px-3 py-2 border-2 border-purple-300 rounded text-center text-2xl font-bold focus:border-purple-500 focus:outline-none"
                />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <button
              onClick={finishRound}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3 rounded-lg"
            >
              ✓ Selesai Ronde
            </button>
            <button
              onClick={resetGame}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 rounded-lg text-sm"
            >
              🗑️ Reset Permainan
            </button>
          </div>
        </div>

        {roundResults.length > 0 && (
          <div className="mt-6 bg-white rounded-3xl p-6 shadow-xl">
            <h3 className="font-bold text-slate-800 mb-3">📋 Hasil Ronde</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {roundResults.map((result, idx) => (
                <div key={idx} className="text-sm bg-slate-50 p-2 rounded">
                  <div className="font-bold text-slate-700">Ronde {result.round}</div>
                  <div className="text-xs text-slate-600 grid grid-cols-2 gap-1 mt-1">
                    {players.map(p => (
                      <div key={p}>{p}: {result.scores[p]}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
