import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import {
  initializeGame,
  playNewSon,
  playNewBox,
  extendSon,
  addToBox,
  playerPass,
  declareFailFirstSon,
  nextRound,
  getRoundScores
} from '../engine/gameEngine.js';

const GameContext = createContext();

export function useGameContext() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameContext harus dipakai dalam GameProvider');
  }
  return context;
}

export function GameProvider({ children, roomId, myUserId }) {
  const [gameState, setGameState] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [loadingGame, setLoadingGame] = useState(true);
  const sessionIdRef = useRef(null);

  // ── Ambil game state awal dari Supabase ──────────────────────
  useEffect(() => {
    if (!roomId) return;

    const fetchSession = async () => {
      setLoadingGame(true);
      try {
        const { data, error } = await supabase
          .from('game_sessions')
          .select('*')
          .eq('room_id', roomId)
          .single();

        if (error) {
          console.error('Error fetching game session:', error);
          return;
        }

        if (data) {
          setSessionId(data.id);
          sessionIdRef.current = data.id;
          setGameState(data.game_state);
        }
      } catch (err) {
        console.error('fetchSession error:', err);
      } finally {
        setLoadingGame(false);
      }
    };

    fetchSession();
  }, [roomId]);

  // ── Realtime: sync game state dari pemain lain ────────────────
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`game:${sessionId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'game_sessions',
        filter: `id=eq.${sessionId}`
      }, (payload) => {
        console.log('Game state updated from Supabase');
        setGameState(payload.new.game_state);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [sessionId]);

  // ── Sync game state ke Supabase ───────────────────────────────
  const syncToSupabase = async (newGameState) => {
    setGameState(newGameState); // Optimistic update lokal dulu

    const { error } = await supabase
      .from('game_sessions')
      .update({
        game_state: newGameState,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionIdRef.current);

    if (error) {
      console.error('Sync error:', error);
    }
  };

  // ── Helper: cek apakah giliran user ini ──────────────────────
  const isMyTurn = () => {
    if (!gameState) return false;
    const currentPlayer = gameState.players[gameState.currentTurnIdx];
    return currentPlayer?.id === myUserId;
  };

  // ── Index pemain ini di array players ────────────────────────
  const myPlayerIdx = gameState?.players.findIndex(p => p.id === myUserId) ?? -1;

  // ── Actions ───────────────────────────────────────────────────
  const actions = {
    playNewSon: (playerIdx, cardIndices) => {
      if (!isMyTurn()) return;
      const result = playNewSon(gameState, playerIdx, cardIndices);
      if (result.success) syncToSupabase(result.gameState);
    },

    playNewBox: (playerIdx, cardIndices) => {
      if (!isMyTurn()) return;
      const result = playNewBox(gameState, playerIdx, cardIndices);
      if (result.success) syncToSupabase(result.gameState);
    },

    extendSon: (playerIdx, cardIdx, sonIdx, position = 'right') => {
      if (!isMyTurn()) return;
      const result = extendSon(gameState, playerIdx, cardIdx, sonIdx, position);
      if (result.success) syncToSupabase(result.gameState);
    },

    addToBox: (playerIdx, cardIdx, boxIdx) => {
      if (!isMyTurn()) return;
      const result = addToBox(gameState, playerIdx, cardIdx, boxIdx);
      if (result.success) syncToSupabase(result.gameState);
    },

    playerPass: (playerIdx) => {
      if (!isMyTurn()) return;
      const result = playerPass(gameState, playerIdx);
      if (result.success) syncToSupabase(result.gameState);
    },

    declareFailFirstSon: (playerIdx) => {
      if (!isMyTurn()) return;
      const result = declareFailFirstSon(gameState, playerIdx);
      if (!result.success) return;

      if (result.restart) {
        const freshState = initializeGame(
          gameState.players.map(p => ({ id: p.id, name: p.name })),
          gameState.minusLimit
        );
        freshState.round = gameState.round;
        syncToSupabase(freshState);
      } else {
        syncToSupabase(result.gameState);
      }
    },

    nextRound: () => {
      const result = nextRound(gameState);
      if (result.success) syncToSupabase(result.gameState);
    },

    getRoundScores: (roundNumber) => {
      if (gameState) return getRoundScores(gameState, roundNumber);
      return [];
    }
  };

  return (
    <GameContext.Provider value={{
      gameState,
      loadingGame,
      myPlayerIdx,
      myUserId,
      isMyTurn,
      ...actions
    }}>
      {children}
    </GameContext.Provider>
  );
}