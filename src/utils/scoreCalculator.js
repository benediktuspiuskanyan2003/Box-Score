import { SON_FAILED_PENALTY, CATE_BONUS, JOKER_BONUS, JOKER_PENALTY } from './constants.js';

/**
 * Calculate the score for a player in a round
 * @param {Object} roundData - Round data for the player
 * @param {boolean} roundData.isCate - Whether the player is CATE (won the round)
 * @param {number} roundData.jokerUsed - Number of jokers used when CATE
 * @param {number} roundData.jokerHeld - Number of jokers held when not CATE
 * @param {boolean} roundData.sonFailed - Whether player failed Son at the beginning
 * @param {number} roundData.cardScore - Total minus value from remaining cards
 * @returns {number} - Total round score (can be positive or negative)
 */
export function calculateRoundScore({
  isCate,
  jokerUsed = 0,
  jokerHeld = 0,
  sonFailed = false,
  cardScore = 0
}) {
  // Son failed penalty overrides everything
  if (sonFailed) {
    return SON_FAILED_PENALTY;
  }

  let score = 0;

  if (isCate) {
    // Player won the round
    // Joker digunakan overrides base bonus
    // Tanpa joker: +50
    // Dengan joker: hanya +100 per joker (tanpa +50 base)
    if (jokerUsed > 0) {
      score = jokerUsed * JOKER_BONUS; // +100 per joker, no base bonus
    } else {
      score = CATE_BONUS; // +50 jika no joker
    }
  } else {
    // Player lost the round
    score -= cardScore; // Minus value from remaining cards
    score -= jokerHeld * JOKER_PENALTY; // -100 per joker held
  }

  return score;
}

/**
 * Check which players need score reset based on minus limit
 * @param {Array} players - Array of player objects with totalScore property
 * @param {number} minusLimit - The agreed minus limit (e.g., -300, -400)
 * @returns {Array} - Array of players with wasReset flag added
 */
export function checkAndResetScores(players, minusLimit) {
  return players.map(player => ({
    ...player,
    wasReset: player.totalScore <= minusLimit,
    score: player.totalScore <= minusLimit ? 0 : player.totalScore
  }));
}

/**
 * Calculate total score for a player from all rounds
 * @param {Array} roundScores - Array of round score objects
 * @returns {number} - Total accumulated score
 */
export function calculateTotalScore(roundScores) {
  return roundScores.reduce((sum, round) => {
    // If score was reset in this round, start fresh from 0
    if (round.score_reset) {
      return round.round_total;
    }
    return sum + (round.round_total || 0);
  }, 0);
}

