import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { calculateRoundScore, checkAndResetScores } from '../utils/scoreCalculator';

/**
 * Hook untuk manage round input dan penyimpanan skor
 */
export function useRound(gameId, groupId, players, minusLimit) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Save round dengan semua skor pemain
   * @param {number} roundNumber - Nomor ronde
   * @param {Object} roundData - Data skor per pemain
   * @param {boolean} isReset - Apakah ada reset skor
   */
  const saveRound = async (roundNumber, roundData, isReset = false) => {
    setLoading(true);
    setError(null);
    try {
      // Create round
      const { data: roundRecord, error: roundError } = await supabase
        .from('rounds')
        .insert([
          {
            game_id: gameId,
            round_number: roundNumber,
            is_reset: isReset
          }
        ])
        .select()
        .single();

      if (roundError) throw roundError;

      // Insert round scores untuk setiap pemain
      const roundScoresData = Object.entries(roundData).map(([playerId, playerRound]) => ({
        round_id: roundRecord.id,
        player_id: playerId,
        is_cate: playerRound.isCate || false,
        joker_used: playerRound.jokerUsed || 0,
        joker_held: playerRound.jokerHeld || 0,
        son_failed: playerRound.sonFailed || false,
        card_score: playerRound.cardScore || 0,
        round_total: playerRound.roundTotal || 0,
        score_reset: playerRound.scoreReset || false
      }));

      const { data: roundScores, error: scoresError } = await supabase
        .from('round_scores')
        .insert(roundScoresData)
        .select();

      if (scoresError) throw scoresError;

      return {
        round: roundRecord,
        scores: roundScores
      };
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Calculate dan save round dengan logic lengkap
   */
  const calculateAndSaveRound = async (
    roundNumber,
    catePlayerId,
    jokerUsedByCate,
    playerCardScores,
    sonFailedPlayers
  ) => {
    setLoading(true);
    setError(null);
    try {
      // Calculate scores untuk setiap pemain
      const roundData = {};
      let totalScores = {};

      // Initialize total scores
      players.forEach(p => {
        totalScores[p.id] = 0;
      });

      // Hitung skor untuk setiap pemain
      players.forEach(player => {
        const cardScore = playerCardScores[player.id] || 0;
        const isCate = player.id === catePlayerId;
        const sonFailed = sonFailedPlayers.includes(player.id);

        const roundScore = calculateRoundScore({
          isCate,
          jokerUsed: isCate ? jokerUsedByCate : 0,
          jokerHeld: !isCate ? (playerCardScores[`${player.id}_jokers`] || 0) : 0,
          sonFailed,
          cardScore: isCate ? 0 : cardScore
        });

        roundData[player.id] = {
          isCate,
          jokerUsed: isCate ? jokerUsedByCate : 0,
          jokerHeld: !isCate ? (playerCardScores[`${player.id}_jokers`] || 0) : 0,
          sonFailed,
          cardScore: isCate ? 0 : cardScore,
          roundTotal: roundScore,
          scoreReset: false
        };

        totalScores[player.id] = roundScore;
      });

      // Check reset scores
      const playersWithTotals = players.map(p => ({
        ...p,
        totalScore: totalScores[p.id]
      }));

      const resetPlayers = checkAndResetScores(playersWithTotals, minusLimit);

      // Update roundData dengan reset info
      resetPlayers.forEach(p => {
        if (roundData[p.id]) {
          roundData[p.id].scoreReset = p.wasReset;
        }
      });

      // Save ke database
      const result = await saveRound(roundNumber, roundData, false);

      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get current game standings
   */
  const getGameStandings = async (gameId) => {
    try {
      if (!gameId || !players || players.length === 0) {
        console.warn('getGameStandings: missing gameId or players', { gameId, playersCount: players?.length });
        return [];
      }

      console.log('getGameStandings: fetching rounds for game', gameId);
      const { data, error: fetchError } = await supabase
        .from('rounds')
        .select('*, round_scores(*)')
        .eq('game_id', gameId)
        .order('round_number', { ascending: true });

      if (fetchError) {
        console.error('getGameStandings fetch error:', fetchError);
        throw fetchError;
      }

      console.log('getGameStandings: fetched rounds', data?.length || 0);

      // Hitung total skor per pemain
      const standings = {};
      players.forEach(p => {
        standings[p.id] = { player: p, totalScore: 0, roundCount: 0 };
      });

      if (data && data.length > 0) {
        data.forEach(round => {
          if (round.round_scores && round.round_scores.length > 0) {
            round.round_scores.forEach(score => {
              if (standings[score.player_id]) {
                if (score.score_reset) {
                  // Score reset to 0 after this round
                  standings[score.player_id].totalScore = 0;
                } else {
                  standings[score.player_id].totalScore += score.round_total;
                }
                standings[score.player_id].roundCount += 1;
              }
            });
          }
        });
      }

      const result = Object.values(standings).sort((a, b) => b.totalScore - a.totalScore);
      console.log('getGameStandings: final result', result);
      return result;
    } catch (err) {
      console.error('getGameStandings error:', err);
      setError(err.message);
      return [];
    }
  };

  return {
    loading,
    error,
    saveRound,
    calculateAndSaveRound,
    getGameStandings
  };
}

