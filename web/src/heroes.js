// Animated hero sprites with arcade bodies, shared by the Hall of Echoes rooms.
// The body sits on the character (not the whole 128x72 frame), feet on the floor.
import { HERO_FRAME } from './art.js';
import { PLAYERS } from './scenes/style.js';

export const BODY = { fire: { w: 14, h: 34 }, water: { w: 14, h: 30 } };

export function makeHero(scene, id, x, floorY, facing = 1) {
  const sprite = scene.physics.add.sprite(x, floorY, PLAYERS[id].sheet).play(`${id}-idle`);
  sprite.body.setSize(BODY[id].w, BODY[id].h);
  sprite.setCollideWorldBounds(true);
  faceHero(sprite, id, facing);
  return sprite;
}

// Face left or right, keeping the body where it is.
export function faceHero(sprite, id, dir) {
  if (!dir) return;
  const ox = dir < 0 ? 1 - HERO_FRAME[id].originX : HERO_FRAME[id].originX;
  sprite.setFlipX(dir < 0).setOrigin(ox, 1);
  sprite.body.setOffset(ox * 128 - BODY[id].w / 2, 72 - BODY[id].h);
}

// Pick idle / run / jump animations from the body's motion.
export function animateHero(sprite, id, dir) {
  const { body } = sprite;
  const onGround = body.blocked.down || body.touching.down;
  const anim = !onGround ? (body.velocity.y < 0 ? 'jump_up' : 'jump_down') : dir ? 'run' : 'idle';
  const key = `${id}-${anim}`;
  if (sprite.anims.currentAnim?.key !== key) sprite.play(key);
}
