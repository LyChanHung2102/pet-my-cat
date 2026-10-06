/**
 * SaveSystem.js — localStorage-backed save/load. Decoupled from game logic.
 */

const KEY = 'petmycat_v1';

export const SaveSystem = {
    save(data) {
        try {
            localStorage.setItem(KEY, JSON.stringify({ version: 1, ...data }));
        } catch (e) {
            console.warn('SaveSystem: could not save.', e);
        }
    },

    load() {
        try {
            const raw = localStorage.getItem(KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    },

    reset() {
        try { localStorage.removeItem(KEY); } catch (_) {}
    },
};
