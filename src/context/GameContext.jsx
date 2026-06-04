import React, { createContext, useContext, useReducer } from 'react';
import {
  initializeGame,
  playCardToSun,
  playNewSun,
  playNewBox,
  extendSun,
  addToBox,
  playerPass,
  declareFailFirstSun,
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

/**
 * Reducer untuk game state
 */
function gameReducer(state, action) {
  switch (action.type) {
    case 'INIT_GAME':
      return action.payload;

    case 'PLAY_CARD_TO_SUN': {
      const result = playCardToSun(
        state,
        action.payload.playerIdx,
        action.payload.cardIdx,
        action.payload.sunIdx,
        action.payload.position
      );
      if (result.success) {
        return result.gameState;
      }
      return state;
    }

    case 'PLAY_NEW_SUN': {
      const result = playNewSun(state, action.payload.playerIdx, action.payload.cardIndices);
      if (result.success) {
        return result.gameState;
      }
      return state;
    }

    case 'PLAY_NEW_BOX': {
      const result = playNewBox(state, action.payload.playerIdx, action.payload.cardIndices);
      if (result.success) {
        return result.gameState;
      }
      return state;
    }

    case 'EXTEND_SUN': {
      const result = extendSun(
        state,
        action.payload.playerIdx,
        action.payload.cardIdx,
        action.payload.sunIdx,
        action.payload.position
      );
      if (result.success) {
        return result.gameState;
      }
      return state;
    }

    case 'ADD_TO_BOX': {
      const result = addToBox(
        state,
        action.payload.playerIdx,
        action.payload.cardIdx,
        action.payload.boxIdx
      );
      if (result.success) {
        return result.gameState;
      }
      return state;
    }

    case 'PLAYER_PASS': {
      const result = playerPass(state, action.payload.playerIdx);
      if (result.success) {
        return result.gameState;
      }
      return state;
    }

    case 'DECLARE_FAIL_FIRST_SUN': {
      const result = declareFailFirstSun(state, action.payload.playerIdx);
      
      if (!result.success) {
        return state; // Gagal, state tidak berubah
      }
      
      if (result.restart) {
        // RESTART: Initialize fresh game state dengan pemain yang sama
        const originalPlayers = state.players.map(p => ({ id: p.id, name: p.name }));
        const freshState = initializeGame(originalPlayers, state.minusLimit);
        // Update round number (tetap di ronde yang sama, hanya restart)
        freshState.round = state.round;
        return freshState;
      }
      
      // CONTINUE: Return updated state (pemain marked as sun_failed, turn ke next player)
      return state;
    }

    case 'NEXT_ROUND': {
      const result = nextRound(state);
      if (result.success) {
        return result.gameState;
      }
      return state;
    }

    default:
      return state;
  }
}

/**
 * GameProvider Component
 */
export function GameProvider({ children, initialPlayers = [], minusLimit = -300 }) {
  const [gameState, dispatch] = useReducer(gameReducer, null, (initial) => {
    if (initialPlayers.length === 0) return null;
    return initializeGame(initialPlayers, minusLimit);
  });

  // Action creators
  const actions = {
    initGame: (players, limit) => {
      dispatch({
        type: 'INIT_GAME',
        payload: initializeGame(players, limit)
      });
    },

    playCardToSun: (playerIdx, cardIdx, sunIdx, position = 'right') => {
      dispatch({
        type: 'PLAY_CARD_TO_SUN',
        payload: { playerIdx, cardIdx, sunIdx, position }
      });
    },

    playNewSun: (playerIdx, cardIndices) => {
      dispatch({
        type: 'PLAY_NEW_SUN',
        payload: { playerIdx, cardIndices }
      });
    },

    playNewBox: (playerIdx, cardIndices) => {
      dispatch({
        type: 'PLAY_NEW_BOX',
        payload: { playerIdx, cardIndices }
      });
    },

    extendSun: (playerIdx, cardIdx, sunIdx, position = 'right') => {
      dispatch({
        type: 'EXTEND_SUN',
        payload: { playerIdx, cardIdx, sunIdx, position }
      });
    },

    addToBox: (playerIdx, cardIdx, boxIdx) => {
      dispatch({
        type: 'ADD_TO_BOX',
        payload: { playerIdx, cardIdx, boxIdx }
      });
    },

    playerPass: (playerIdx) => {
      dispatch({
        type: 'PLAYER_PASS',
        payload: { playerIdx }
      });
    },

    declareFailFirstSun: (playerIdx) => {
      dispatch({
        type: 'DECLARE_FAIL_FIRST_SUN',
        payload: { playerIdx }
      });
    },

    nextRound: () => {
      dispatch({
        type: 'NEXT_ROUND'
      });
    },

    getRoundScores: (roundNumber) => {
      if (gameState) {
        return getRoundScores(gameState, roundNumber);
      }
      return [];
    }
  };

  return (
    <GameContext.Provider value={{ gameState, ...actions }}>
      {children}
    </GameContext.Provider>
  );
}
