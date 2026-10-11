// Shared look: a 640x360 pixel-art canvas scaled up crisply, the DawnBringer 16
// palette that DawnLike is drawn in, and the pack's 8x8 pixel font (ASCII only).
export const W = 640;
export const H = 360;

// DawnBringer 16.
export const DB = {
  black: 0x140c1c, plum: 0x442434, navy: 0x30346d, iron: 0x4e4a4e,
  brown: 0x854c30, moss: 0x346524, red: 0xd04648, stone: 0x757161,
  blue: 0x597dce, orange: 0xd27d2c, slate: 0x8595a1, green: 0x6daa2c,
  skin: 0xd2aa99, cyan: 0x6dc2ca, yellow: 0xdad45e, white: 0xdeeed6,
};
export const hex = n => `#${n.toString(16).padStart(6, '0')}`;

export const COLORS = {
  bg: DB.black,
  panel: 0x1e1626,
  outline: DB.iron,
  select: DB.yellow,
  win: DB.green,
  loss: DB.red,
  text: hex(DB.white),
  dim: hex(DB.slate),
  gold: hex(DB.yellow),
  good: hex(DB.green),
  bad: hex(DB.red),
};

export const GEM = { red: DB.red, blue: DB.blue };
export const GEM_LIGHT = { red: 0xff8a7a, blue: 0x9fd0ff };

export const PLAYERS = {
  fire: {
    name: 'Fireboy', sheet: 'fire', color: DB.orange, glow: 0xff9a3c, text: '#ff9a3c', side: -1,
    keys: { down: 'Q', up: 'E', selA: 'W', selB: 'S', ready: 'R', left: 'A', right: 'D', jump: 'W' },
  },
  water: {
    name: 'Watergirl', sheet: 'water', color: DB.cyan, glow: 0x7fd6ff, text: '#7fd6ff', side: 1,
    keys: { down: 'COMMA', up: 'PERIOD', selA: 'UP', selB: 'DOWN', ready: 'ENTER', left: 'LEFT', right: 'RIGHT', jump: 'UP' },
  },
};

export const FONT = 'SDS';

// Pixel text: sizes should be multiples of 8 so the font stays crisp.
// Phaser measures this font with almost no descent, which clips the tails of g, y, q
// and p on the last line; the bottom padding makes room for them.
export function font(size = 8, color = COLORS.text) {
  return { fontFamily: FONT, fontSize: `${size}px`, color, resolution: 1, padding: { bottom: Math.ceil(size / 4) } };
}

// Text with a 1px dark drop shadow, the usual way to keep pixel text readable over art.
export function label(scene, x, y, str, size = 8, color = COLORS.text, originX = 0.5, originY = 0.5) {
  return scene.add.text(Math.round(x), Math.round(y), str, { ...font(size, color), align: 'center', lineSpacing: size / 2 })
    .setOrigin(originX, originY)
    .setShadow(Math.max(1, size / 8), Math.max(1, size / 8), hex(DB.black), 0, false, true);
}
