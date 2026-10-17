/**
 * Mahalaxmi Kirana Store — Reactive App Store
 */

'use strict';

const listeners = new Set();

const state = {
  isStoreOpen: true,
  unreadCount: 0,
  isAudioMuted: localStorage.getItem('admin_audio_muted') === 'true',
  audioUnlocked: localStorage.getItem('admin_audio_unlocked') === 'true',
};

function getState() {
  return { ...state };
}

function setState(partial) {
  Object.assign(state, partial);
  for (const listener of listeners) {
    try {
      listener(state);
    } catch (e) {
      console.error('Store listener error:', e);
    }
  }
}

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

window.AdminStore = { getState, setState, subscribe };
