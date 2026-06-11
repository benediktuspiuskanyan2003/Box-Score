import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGroup } from '../hooks/useGroup';
import { useGame } from '../hooks/useGame';
import { BottomNav } from '../components/BottomNav';
import { supabase } from '../supabaseClient';

/**
 * Halaman riwayat semua ronde yang dimainkan
 */
export function History() {
  const { groupCode } = useParams();
  const navigate = useNavigate();
  const { group, players, fetchGroup, loading: groupLoading } = useGroup();
  const { game, rounds, getOrCreateGame, loading: gameLoading } = useGame(group?.id);
  const [roundDetails, setRoundDetails] = useState([]);

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
    const loadRoundDetails = async () => {
      if (rounds.length > 0) {
        const details = await Promise.all(
          rounds.map(async (round) => {
            const { data, error } = await supabase
              .from('round_scores')
              .select('*, players(name)')
              .eq('round_id', round.id);

            return {
              roundNumber: round.round_number,
              isReset: round.is_reset,
              scores: data || []
            };
          })
        );
        setRoundDetails(details);
      }
    };
    loadRoundDetails();
  }, [rounds]);

  if (groupLoading || gameLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Memuat riwayat...</p>
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
          <h1 className="text-2xl font-bold text-gray-900">📋 Riwayat Ronde</h1>
          <p className="text-xs text-gray-500">Total {roundDetails.length} ronde</p>
        </div>

        {roundDetails.length === 0 ? (
          <div className="bg-white rounded-lg p-6 text-center text-gray-600">
            <p className="mb-2">Belum ada ronde</p>
            <p className="text-sm">Mulai input ronde pertama</p>
          </div>
        ) : (
          <div className="space-y-4">
            {roundDetails
              .slice()
              .reverse()
              .map((round, idx) => (
                <div
                  key={round.roundNumber}
                  className="bg-white rounded-lg p-4 shadow-md border-l-4 border-blue-500"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-lg text-gray-900">
                      Ronde #{roundDetails.length - idx}
                    </h3>
                    {round.isReset && (
                      <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded font-semibold">
                        Ada Reset
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {round.scores.map((score) => {
                      const player = players.find(p => p.id === score.player_id);
                      const statusIcon = score.son_failed
                        ? '☀️'
                        : score.is_cate
                        ? '🏆'
                        : '📉';

                      return (
                        <div
                          key={score.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <span>{statusIcon}</span>
                            <span className="font-medium">{player?.name}</span>
                            {score.score_reset && (
                              <span className="bg-red-100 text-red-700 text-xs px-2 rounded">
                                Reset
                              </span>
                            )}
                          </div>
                          <span
                            className={`font-bold ${
                              score.round_total >= 0
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}
                          >
                            {score.round_total >= 0 ? '+' : ''}{score.round_total}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Details */}
                  <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-600">
                    {round.scores.map((score) => {
                      const player = players.find(p => p.id === score.player_id);
                      if (!score.is_cate && score.card_score > 0) {
                        return (
                          <div key={score.id}>
                            {player?.name}: {score.card_score} kartu
                            {score.joker_held > 0 && ` + ${score.joker_held}J`}
                          </div>
                        );
                      }
                      if (score.is_cate) {
                        return (
                          <div key={score.id}>
                            {player?.name}: CATE
                            {score.joker_used > 0 && ` + ${score.joker_used}J`}
                          </div>
                        );
                      }
                      return null;
                    })}
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

