import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useSoundEffect } from '../hooks/useSoundEffect';
import {
  initializeGame,
  playNewSon,
  playNewBox,
  extendSon,
  addToBox,
  playerPass,
  declareFailFirstSon,
  nextRound,
  getRoundScores,
  throwJoker,
  throwJokerForced,
} from '../engine/gameEngine.js';

const GameContext = createContext();

export function useGameContext() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameContext harus dipakai dalam GameProvider');
  }
  return context;
}

/**
 * Tentukan suara apa yang harus dimainkan berdasarkan perbandingan
 * gameState SEBELUM dan SETELAH sebuah aksi terjadi.
 *
 * Dipanggil dari dua tempat:
 * 1. Setelah aksi lokal sukses (pelaku aksi)
 * 2. Saat menerima update realtime dari Supabase (pemain lain)
 *
 * Supaya kedua jalur menghasilkan suara yang sama, logic deteksi
 * berdasarkan PERBEDAAN STATE, bukan berdasarkan "siapa yang klik apa".
 */
function detectSoundFromStateChange(prevState, newState) {
  if (!prevState || !newState) return null;

  // ── Cate (ronde berakhir karena ada pemain habis kartu) ──
  if (newState.phase === 'round_end' && prevState.phase !== 'round_end') {
    const hasCateWinner = newState.players.some(
      p => p.status === 'cate' || p.status === 'cate_tangan'
    );
    if (hasCateWinner && !newState.noWinner) return 'cate';
    return 'penalty'; // round_end tanpa cate winner = kurang menguntungkan
  }

  // ── Gagal Son (status berubah jadi son_failed) ──
  const newlyFailedSon = newState.players.some((p, idx) =>
    p.status === 'son_failed' && prevState.players[idx]?.status !== 'son_failed'
  );
  if (newlyFailedSon) return 'penalty';

  // ── Joker dipakai/dibuang (riwayat aksi terbaru) ──
  const lastHistory = newState.history?.[newState.history.length - 1];
  if (lastHistory) {
    if (lastHistory.action === 'throw_joker') return 'joker';

    // Cek apakah aksi terbaru melibatkan joker (new_son/extend_son dengan joker)
    if (lastHistory.action === 'new_son' || lastHistory.action === 'extend_son') {
      const sons = newState.meja.sons;
      const relevantSon = lastHistory.sonId
        ? sons.find(s => s.id === lastHistory.sonId)
        : sons[sons.length - 1];
      if (relevantSon?.cards.some(c => c.isJoker)) return 'joker';
      if (lastHistory.action === 'new_son') return 'card_play';
      return 'card_play';
    }

    if (lastHistory.action === 'new_box' || lastHistory.action === 'add_to_box') {
      return 'box';
    }

    if (lastHistory.action === 'play_to_son') return 'card_play';
  }

  // ── Giliran berpindah (fallback, kalau tidak ada history match di atas) ──
  if (newState.currentTurnIdx !== prevState.currentTurnIdx) {
    return 'turn';
  }

  return null;
}

export function GameProvider({ children, roomId, myUserId }) {
  const [gameState, setGameState] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [loadingGame, setLoadingGame] = useState(true);
  const sessionIdRef = useRef(null);
  const prevGameStateRef = useRef(null);
  const { play } = useSoundEffect();

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
          prevGameStateRef.current = data.game_state; // baseline, tidak perlu play suara
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
        const newState = payload.new.game_state;

        // Deteksi & mainkan suara berdasarkan perbedaan state
        const sound = detectSoundFromStateChange(prevGameStateRef.current, newState);
        if (sound) play(sound);

        prevGameStateRef.current = newState;
        setGameState(newState);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [sessionId, play]);

  // ── Sync game state ke Supabase ───────────────────────────────
  const syncToSupabase = async (newGameState) => {
    // Mainkan suara untuk pelaku aksi sendiri (optimistic, sebelum konfirmasi server)
    const sound = detectSoundFromStateChange(prevGameStateRef.current, newGameState);
    if (sound) play(sound);

    prevGameStateRef.current = newGameState;
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
    playNewSon: (playerIdx, cardIndices, jokerPosition = 'auto') => {
      const currentPlayer = gameState?.players[playerIdx];
      if (!currentPlayer?.isBot && !isMyTurn()) return;
      console.log('[DEBUG] jokerPosition received:', jokerPosition, typeof jokerPosition);
      const result = playNewSon(gameState, playerIdx, cardIndices, jokerPosition);
      console.log('[DEBUG] son cards after:', result.gameState?.meja?.sons?.slice(-1)[0]?.cards?.map(c => c.isJoker ? 'JOKER' : c.rank));
      if (result.success) syncToSupabase(result.gameState);
    },

    playNewBox: (playerIdx, cardIndices) => {
      const currentPlayer = gameState?.players[playerIdx];
      if (!currentPlayer?.isBot && !isMyTurn()) return;
      const result = playNewBox(gameState, playerIdx, cardIndices);
      if (result.success) syncToSupabase(result.gameState);
    },

    extendSon: (playerIdx, cardIdx, sonIdx, position = 'right') => {
      const currentPlayer = gameState?.players[playerIdx];
      if (!currentPlayer?.isBot && !isMyTurn()) return;
      const result = extendSon(gameState, playerIdx, cardIdx, sonIdx, position);
      if (result.success) syncToSupabase(result.gameState);
    },

    addToBox: (playerIdx, cardIndices, boxIdx) => {
      const currentPlayer = gameState?.players[playerIdx];
      if (!currentPlayer?.isBot && !isMyTurn()) return;
      const result = addToBox(gameState, playerIdx, cardIndices, boxIdx);
      if (result.success) syncToSupabase(result.gameState);
    },

    playerPass: (playerIdx) => {
      const currentPlayer = gameState?.players[playerIdx];
      if (!currentPlayer?.isBot && !isMyTurn()) return;
      const result = playerPass(gameState, playerIdx);
      if (result.success) syncToSupabase(result.gameState);
    },

    declareFailFirstSon: (playerIdx) => {
    const currentPlayer = gameState?.players[playerIdx];
    if (!currentPlayer?.isBot && !isMyTurn()) return;
    const result = declareFailFirstSon(gameState, playerIdx);
    if (!result.success) return;

    if (result.restart) {
      const freshState = initializeGame(
        gameState.players.map(p => ({
          id: p.id,
          name: p.name,
          isBot: p.isBot || false,
        })),
        gameState.minusLimit
      );
      freshState.round = gameState.round;

      // ✅ FIX: pertahankan totalScore dari ronde sebelumnya
      freshState.players.forEach((player, idx) => {
        player.totalScore = gameState.players[idx].totalScore || 0;
      });

      // ✅ FIX: giliran pertama berdasarkan totalScore tertinggi, bukan index 0
      let highestScoreIdx = 0;
      let highestScore = freshState.players[0].totalScore;
      freshState.players.forEach((player, idx) => {
        if (player.totalScore > highestScore) {
          highestScore = player.totalScore;
          highestScoreIdx = idx;
        }
      });
      freshState.currentTurnIdx = highestScoreIdx;

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
    },

    throwJoker: (playerIdx, cardIdx) => {
      const currentPlayer = gameState?.players[playerIdx];
      if (!currentPlayer?.isBot && !isMyTurn()) return;
      const result = throwJoker(gameState, playerIdx, cardIdx);
      if (result.success) syncToSupabase(result.gameState);
    },

    throwJokerForced: (playerIdx, cardIdx) => {
      const currentPlayer = gameState?.players[playerIdx];
      if (!currentPlayer?.isBot && !isMyTurn()) return;
      const result = throwJokerForced(gameState, playerIdx, cardIdx);
      if (result.success) syncToSupabase(result.gameState);
    },
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