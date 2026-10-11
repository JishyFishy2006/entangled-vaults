import { panel } from './art.js';
import { Menu } from './menu.js';
import { COLORS, DB, H, W, label } from './scenes/style.js';

// Teaching overlays, shared by both levels:
//   conceptCard - the proper term for something, the first time it is used (once a session),
//   ask         - a prediction before the players find out,
//   recap       - a short summary in real terms after a round or room,
//   tag         - a floating term over an object, every time it is used.
// Cards are modal: physics pauses, and scenes ignore their own keys while
// `isTeaching(scene)`. Cards asked for while one is open wait their turn.
const DEPTH = 40;
const BOX_W = 520;   // 60 characters a line
const seen = new Set();

export const isTeaching = scene => !!scene.teaching;

// Call from a scene's create(): Phaser reuses scene objects, so clear any old state.
export function teachInit(scene) {
  scene.teaching = false;
  scene.teachQueue = [];
  scene.teachKeys = new Set();   // concept cards open or waiting in this scene
}

function enqueue(scene, show) {
  if (scene.teaching) scene.teachQueue.push(show);
  else show();
}

function open(scene) {
  scene.teaching = true;
  scene.physics?.world?.pause();
}

// Closing waits a moment, so the key that closed the card can't also act in the scene.
function close(scene, objects) {
  for (const o of objects) o.destroy();
  scene.time.delayedCall(80, () => {
    scene.teaching = false;
    scene.physics?.world?.resume();
    scene.input.keyboard.resetKeys();
    scene.teachQueue.shift()?.();
  });
}

// A dimmed screen and a panel with a title, a subtitle, wrapped lines and a footer.
// `extra` leaves room at the bottom for a menu. Returns the objects and the panel's bottom.
function frame(scene, { title, sub, lines, footer, extra = 0 }) {
  const objects = [scene.add.rectangle(W / 2, H / 2, W, H, DB.black, 0.6).setDepth(DEPTH)];
  const body = label(scene, W / 2, 0, lines.join('\n'), 8, COLORS.text, 0.5, 0)
    .setWordWrapWidth(BOX_W - 40).setLineSpacing(5).setDepth(DEPTH + 2);
  const h = 44 + (sub ? 12 : 0) + body.height + 14 + extra + (footer ? 16 : 0);
  const y = Math.round((H - h) / 2);
  objects.push(panel(scene, (W - BOX_W) / 2, y, BOX_W, h, 0.97).setDepth(DEPTH + 1));
  objects.push(label(scene, W / 2, y + 18, title, 16, COLORS.gold).setDepth(DEPTH + 2));
  let top = y + 34;
  if (sub) { objects.push(label(scene, W / 2, top + 2, sub, 8, COLORS.dim).setDepth(DEPTH + 2)); top += 14; }
  body.setY(top + 4);
  objects.push(body);
  const bottom = y + h;
  if (footer) objects.push(label(scene, W / 2, bottom - 12, footer, 8, COLORS.dim).setDepth(DEPTH + 2));
  return { objects, bottom };
}

// A card that closes on ENTER or SPACE (not in its first moments, so a held key can't skip it).
function card(scene, content, footer, then, onClosed) {
  enqueue(scene, () => {
    open(scene);
    const { objects } = frame(scene, { ...content, footer });
    const kb = scene.input.keyboard;
    const openedAt = scene.time.now;
    const done = () => {
      if (scene.time.now - openedAt < 300) return;
      kb.off('keydown-ENTER', done);
      kb.off('keydown-SPACE', done);
      close(scene, objects);
      onClosed?.();
      if (then) scene.time.delayedCall(90, then);
    };
    kb.on('keydown-ENTER', done);
    kb.on('keydown-SPACE', done);
  });
}

// The first time a concept comes up: its card. Later: nothing (tags carry the term).
// Calls `then` once the card is closed, or straight away if it was seen already. A card
// counts as seen once it is closed, so one lost to a scene restart comes back.
export function conceptCard(scene, key, concept, then) {
  if (seen.has(key) || scene.teachKeys.has(key)) { then?.(); return false; }
  scene.teachKeys.add(key);
  card(scene, { ...concept, lines: [concept.lines.join(' ')] }, 'ENTER: got it', then, () => seen.add(key));   // one paragraph
  return true;
}

export function recap(scene, content, then) {
  card(scene, content, 'ENTER: continue', then);
}

// A prediction: a question and a row of answers (either player's left/right, ENTER).
export function ask(scene, { title, sub, lines, options }, onAnswer) {
  enqueue(scene, () => {
    open(scene);
    const { objects, bottom } = frame(scene, { title, sub, lines, extra: 26 });
    const menu = new Menu(scene, W / 2, bottom - 20, options.map((text, i) => ({
      label: text,
      action: () => {
        menu.destroy();
        close(scene, objects);
        scene.time.delayedCall(90, () => onAnswer(i));
      },
    })), { depth: DEPTH + 3, modal: true });
  });
}

// A proper term that rises and fades over the thing that was just used.
export function tag(scene, x, y, text, color = COLORS.gold, ms = 1600) {
  const t = label(scene, x, y, text, 8, color).setDepth(30);
  const half = t.width / 2 + 2;
  t.setX(Math.round(Math.min(W - half, Math.max(half, x))));
  scene.tweens.add({ targets: t, y: y - 14, alpha: { from: 1, to: 0 }, duration: ms, ease: 'Quad.easeIn', onComplete: () => t.destroy() });
  return t;
}
