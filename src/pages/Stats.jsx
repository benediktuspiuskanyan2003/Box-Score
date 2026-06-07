import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGroup } from '../hooks/useGroup';
import { useGame } from '../hooks/useGame';
import { BottomNav } from '../components/BottomNav';
import { supabase } from '../supabaseClient';

/**
 * Halaman statistik pemain
 */
export function Stats() {
  const { groupCode } = useParams();
  const navigate = useNavigate();
  const { group, players, fetchGroup, loading: groupLoading } = useGroup();
  const { game, rounds, getOrCreateGame, loading: gameLoading } = useGame(group?.id);
  const [playerStats, setPlayerStats] = useState([]);

  useEffect(() => {
    const init = async () => {
      if (!group) {
        await fetchGroup(groupCode);
      }
    };
    init();
  }, [groupCode]);

  useEffect(() => {
    const init = async () => {
      if (group?.id && !game) {
        await getOrCreateGame();
      }
    };
    init();
  }, [group?.id]);

  useEffect(() => {
    const calculateStats = async () => {
      if (rounds.length === 0) {
        setPlayerStats(players.map(p => ({
          id: p.id,
          name: p.name,
          totalScore: 0,
          roundsPlayed: 0,
          winsAsCate: 0,
          averageScore: 0,
          resets: 0
        })));
        return;
      }

      const stats = {};
      players.forEach(p => {
        stats[p.id] = {
          id: p.id,
          name: p.name,
          totalScore: 0,
          roundsPlayed: 0,
          winsAsCate: 0,
          averageScore: 0,
          resets: 0,
          scores: []
        };
      });

      // Fetch all round scores
      for (const round of rounds) {
        const { data, error } = await supabase
          .from('round_scores')
          .select('*')
          .eq('round_id', round.id);

        if (data) {
          data.forEach(score => {
            if (stats[score.player_id]) {
              const s = stats[score.player_id];
              s.scores.push(score.round_total);
              s.roundsPlayed += 1;

              if (score.score_reset) {
                s.resets += 1;
                s.totalScore = score.round_total;
              } else {
                s.totalScore += score.round_total;
              }

              if (score.is_cate) {
                s.winsAsCate += 1;
              }
            }
          });
        }
      }

      // Calculate average
      Object.keys(stats).forEach(playerId => {
        const s = stats[playerId];
        s.averageScore = s.roundsPlayed > 0 
          ? (s.totalScore / s.roundsPlayed).toFixed(2) 
          : 0;
      });

      const sortedStats = Object.values(stats).sort((a, b) => b.totalScore - a.totalScore);
      setPlayerStats(sortedStats);
    };

    calculateStats();
  }, [rounds, players]);

  if (groupLoading || gameLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Memuat statistik...</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-600">Grup tidak ditemukan</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 pb-40">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(`/game/${groupCode}`)}
            className="text-blue-600 font-semibold mb-2"
          >
            ← Kembali
          </button>
          <h1 className="text-2xl font-bold text-gray-900">📊 Statistik Pemain</h1>
          <p className="text-xs text-gray-500">Total {rounds.length} ronde dimainkan</p>
        </div>

        {playerStats.length === 0 ? (
          <div className="bg-white rounded-lg p-6 text-center text-gray-600">
            <p>Belum ada data statistik</p>
          </div>
        ) : (
          <div className="space-y-3">
            {playerStats.map((stat, index) => (
              <div
                key={stat.id}
                className={`rounded-lg p-4 shadow-md border-l-4 ${
                  index === 0
                    ? 'bg-yellow-50 border-yellow-500'
                    : index === 1
                    ? 'bg-gray-100 border-gray-500'
                    : index === 2
                    ? 'bg-orange-50 border-orange-500'
                    : 'bg-white border-blue-500'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {index === 0 && <span className="text-xl">🥇</span>}
                    {index === 1 && <span className="text-xl">🥈</span>}
                    {index === 2 && <span className="text-xl">🥉</span>}
                    <span className="font-bold text-lg">{stat.name}</span>
                  </div>
                  <span className={`text-2xl font-bold ${
                    stat.totalScore >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.totalScore >= 0 ? '+' : ''}{stat.totalScore}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-sm">
                  <div className="bg-white bg-opacity-50 rounded p-2">
                    <div className="text-xs text-gray-600">Ronde</div>
                    <div className="font-bold">{stat.roundsPlayed}</div>
                  </div>
                  <div className="bg-white bg-opacity-50 rounded p-2">
                    <div className="text-xs text-gray-600">CATE</div>
                    <div className="font-bold">{stat.winsAsCate}</div>
                  </div>
                  <div className="bg-white bg-opacity-50 rounded p-2">
                    <div className="text-xs text-gray-600">Rata-rata</div>
                    <div className="font-bold">{stat.averageScore}</div>
                  </div>
                  <div className="bg-white bg-opacity-50 rounded p-2">
                    <div className="text-xs text-gray-600">Reset</div>
                    <div className="font-bold">{stat.resets}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav groupCode={groupCode} />
    </div>
  );
}

