/**
 * useSoundEffect.js — Sound manager pakai Howler.js
 *
 * Cara pakai:
 *   import { useSoundEffect } from '../hooks/useSoundEffect';
 *   const { play } = useSoundEffect();
 *   play('card_play');
 *
 * Semua file suara harus ada di /public/sounds/<nama>.mp3
 * Preload terjadi sekali saat hook pertama dipakai (module-level cache),
 * supaya tidak reload Howl tiap re-render komponen.
 */

import { useCallback, useRef, useEffect } from 'react';
import { Howl } from 'howler';

// Daftar semua sound effect yang dipakai di game.
// Key = nama yang dipanggil dari kode, value = path file di /public.
const SOUND_FILES = {
  shuffle: '/sounds/shuffle.mp3',
  deal: '/sounds/deal.mp3',
  card_play: '/sounds/card_play.mp3',
  box: '/sounds/box.mp3',
  cate: '/sounds/cate.mp3',
  penalty: '/sounds/penalty.mp3',
  turn: '/sounds/turn.mp3',
  joker: '/sounds/joker.mp3',
};

// Cache di level module — sekali dibuat, dipakai ulang oleh semua komponen.
// Mencegah Howler reload file yang sama berkali-kali tiap komponen mount.
const howlCache = {};

function getHowl(name) {
  if (!SOUND_FILES[name]) {
    console.warn(`[useSoundEffect] Sound "${name}" tidak terdaftar di SOUND_FILES`);
    return null;
  }

  if (!howlCache[name]) {
    howlCache[name] = new Howl({
      src: [SOUND_FILES[name]],
      volume: 0.6,
      preload: true,
      onloaderror: (id, err) => {
        console.warn(`[useSoundEffect] Gagal load "${name}":`, err);
      },
    });
  }

  return howlCache[name];
}

export function useSoundEffect() {
  // Track apakah komponen masih mounted, supaya tidak play suara
  // setelah komponen unmount (misal user pindah halaman saat suara mau play).
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * Mainkan sound effect berdasarkan nama.
   * @param {string} name - salah satu key di SOUND_FILES
   */
  const play = useCallback((name) => {
    if (!mountedRef.current) return;
    const howl = getHowl(name);
    if (howl) howl.play();
  }, []);

  return { play };
}