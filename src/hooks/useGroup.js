import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { generateCode } from '../utils/codeGenerator';

/**
 * Hook untuk manage grup - membuat, join, dan fetch data grup
 */
export function useGroup() {
  const [group, setGroup] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch grup berdasarkan kode
   */
  const fetchGroup = async (code) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('groups')
        .select('*')
        .eq('code', code)
        .single();

      if (fetchError) throw fetchError;

      setGroup(data);
      
      // Save to localStorage
      localStorage.setItem('lastGroupCode', code);

      // Fetch players in this group
      await fetchPlayers(data.id);

      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch semua pemain dalam satu grup
   */
  const fetchPlayers = async (groupId) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('players')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      setPlayers(data || []);
      return data || [];
    } catch (err) {
      setError(err.message);
      return [];
    }
  };

  /**
   * Buat grup baru
   */
  const createGroup = async (groupName, minusLimit, playerNames) => {
    setLoading(true);
    setError(null);
    try {
      // Generate unique code
      let code;
      let isUnique = false;
      while (!isUnique) {
        code = generateCode();
        const { data } = await supabase
          .from('groups')
          .select('id')
          .eq('code', code)
          .limit(1);

        isUnique = !data || data.length === 0;
      }

      // Create group
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .insert([
          {
            code,
            name: groupName,
            minus_limit: minusLimit
          }
        ])
        .select()
        .single();

      if (groupError) throw groupError;

      setGroup(groupData);

      // Add players
      const playersToInsert = playerNames.map(name => ({
        group_id: groupData.id,
        name: name.trim()
      }));

      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .insert(playersToInsert)
        .select();

      if (playersError) throw playersError;

      setPlayers(playersData);

      // Save to localStorage
      localStorage.setItem('lastGroupCode', code);

      return { group: groupData, players: playersData };
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get last group dari localStorage
   */
  const getLastGroup = async () => {
    const lastCode = localStorage.getItem('lastGroupCode');
    if (lastCode) {
      return await fetchGroup(lastCode);
    }
    return null;
  };

  /**
   * Fetch semua grup yang ada (limit 100)
   */
  const getAllGroups = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('groups')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (fetchError) throw fetchError;

      return data || [];
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch group dengan jumlah pemain
   */
  const getGroupsWithPlayerCount = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('groups')
        .select('*, players(count)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (fetchError) throw fetchError;

      return data || [];
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  /**
   * Hapus grup dan semua data terkait
   */
  const deleteGroup = async (groupId) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch semua games dalam grup
      const { data: games, error: gamesError } = await supabase
        .from('games')
        .select('id')
        .eq('group_id', groupId);

      if (gamesError) throw gamesError;

      // 2. Hapus semua round_scores untuk games dalam grup
      if (games && games.length > 0) {
        const gameIds = games.map(g => g.id);
        
        for (const gameId of gameIds) {
          // Fetch rounds terlebih dahulu
          const { data: rounds } = await supabase
            .from('rounds')
            .select('id')
            .eq('game_id', gameId);

          if (rounds && rounds.length > 0) {
            const roundIds = rounds.map(r => r.id);
            const { error: scoresError } = await supabase
              .from('round_scores')
              .delete()
              .in('round_id', roundIds);

            if (scoresError) throw scoresError;
          }

          // Hapus rounds
          const { error: roundsError } = await supabase
            .from('rounds')
            .delete()
            .eq('game_id', gameId);

          if (roundsError) throw roundsError;
        }

        // Hapus games
        const { error: deleteGamesError } = await supabase
          .from('games')
          .delete()
          .in('id', gameIds);

        if (deleteGamesError) throw deleteGamesError;
      }

      // 3. Hapus semua players dalam grup
      const { error: playersError } = await supabase
        .from('players')
        .delete()
        .eq('group_id', groupId);

      if (playersError) throw playersError;

      // 4. Hapus grup
      const { error: groupError } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);

      if (groupError) throw groupError;

      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    group,
    players,
    loading,
    error,
    fetchGroup,
    fetchPlayers,
    createGroup,
    getLastGroup,
    getAllGroups,
    getGroupsWithPlayerCount,
    deleteGroup
  };
}

