import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

/**
 * Hook untuk manage game aktif - membuat, fetch, dan track game status
 */
export function useGame(groupId) {
  const [game, setGame] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch atau create game untuk grup
   */
  const getOrCreateGame = async () => {
    // Guard: jangan proceed jika groupId undefined
    if (!groupId) {
      console.error('getOrCreateGame: groupId is undefined');
      setError('Group ID is required to create/fetch game');
      return null;
    }

    console.log('getOrCreateGame: Looking for game with groupId:', groupId);
    setLoading(true);
    setError(null);
    try {
      // Fetch latest game yang belum selesai
      const { data, error: fetchError } = await supabase
        .from('games')
        .select('*')
        .eq('group_id', groupId)
        .is('finished_at', null)
        .order('started_at', { ascending: false })
        .limit(1);

      if (fetchError) {
        console.error('getOrCreateGame fetch error:', fetchError);
        throw fetchError;
      }

      if (data && data.length > 0) {
        // Game already exists
        console.log('getOrCreateGame: Found existing game:', data[0].id);
        setGame(data[0]);
        await fetchRounds(data[0].id);
        return data[0];
      } else {
        // Create new game
        console.log('getOrCreateGame: Creating new game');
        const { data: newGame, error: createError } = await supabase
          .from('games')
          .insert([{ group_id: groupId }])
          .select()
          .single();

        if (createError) {
          console.error('getOrCreateGame create error:', createError);
          throw createError;
        }

        console.log('getOrCreateGame: New game created:', newGame.id);
        setGame(newGame);
        setRounds([]);
        return newGame;
      }
    } catch (err) {
      console.error('getOrCreateGame catch error:', err.message);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch semua rounds dalam game
   */
  const fetchRounds = async (gameId) => {
    try {
      console.log('fetchRounds: Fetching rounds for game ID:', gameId);
      const { data, error: fetchError } = await supabase
        .from('rounds')
        .select('*, round_scores(*)')
        .eq('game_id', gameId)
        .order('round_number', { ascending: true });

      if (fetchError) {
        console.error('fetchRounds error:', fetchError);
        throw fetchError;
      }

      console.log('fetchRounds: Found', data?.length || 0, 'rounds');
      setRounds(data || []);
      return data || [];
    } catch (err) {
      console.error('fetchRounds catch error:', err.message);
      setError(err.message);
      return [];
    }
  };

  /**
   * Finish game
   */
  const finishGame = async (gameId) => {
    try {
      const { data, error: updateError } = await supabase
        .from('games')
        .update({ finished_at: new Date().toISOString() })
        .eq('id', gameId)
        .select()
        .single();

      if (updateError) throw updateError;

      setGame(data);
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    }
  };

  return {
    game,
    rounds,
    loading,
    error,
    getOrCreateGame,
    fetchRounds,
    finishGame
  };
}
