/**
 * Generate a random 6-character group code (uppercase letters + numbers)
 * Excludes similar looking characters: I, O, 0 (zero), 1 (one), L
 * @returns {string} - 6-character code like "GENG01"
 */
export function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(
    { length: 6 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

