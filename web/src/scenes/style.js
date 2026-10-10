// Shared look and per-player controls for the scenes.
export const W = 960;
export const H = 540;

export const COLORS = {
  bg: 0x1d1f27,
  panel: 0x2a2d38,
  outline: 0x4a4f60,
  select: 0xffd54f,
  win: 0x43a047,
  loss: 0xe53935,
  text: '#e8e8ee',
  dim: '#9aa0b4',
};

export const GEM = { red: 0xe53935, blue: 0x1e88e5 };

export const PLAYERS = {
  fire: {
    name: 'Fireboy', x: 240, color: 0xff7043,
    keys: { down: 'Q', up: 'E', selA: 'W', selB: 'S', ready: 'R' },
    help: 'Q / E  turn dial\nW / S  pick sign A / B\nR  ready',
  },
  water: {
    name: 'Watergirl', x: 720, color: 0x4fc3f7,
    keys: { down: 'COMMA', up: 'PERIOD', selA: 'UP', selB: 'DOWN', ready: 'ENTER' },
    help: ', / .  turn dial\n↑ / ↓  pick sign A / B\nEnter  ready',
  },
};

export const font = (size, color = COLORS.text) => ({ fontFamily: 'system-ui, sans-serif', fontSize: `${size}px`, color });
