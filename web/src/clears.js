// Which levels the player has cleared, kept in browser storage. Every read and
// write is wrapped: if storage is unavailable, nothing is marked and nothing breaks.
const KEY = 'entangled-vaults-cleared';

function load() {
  try {
    const ids = JSON.parse(globalThis.localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

export const isCleared = id => load().includes(id);

export function markCleared(id) {
  try {
    const ids = load();
    if (!ids.includes(id)) globalThis.localStorage.setItem(KEY, JSON.stringify([...ids, id]));
  } catch { /* storage unavailable: no checkmarks */ }
}
