/**
 * Avatar configuration.
 *
 * To swap the procedural character for a real model:
 *   1. Export a rigged, T-pose or A-pose character as public/models/vansh.glb
 *      (facing +Z, feet at the origin, roughly 1.75 units tall).
 *   2. Set `source: 'glb'` below.
 *   3. Point `bones` at the bone names inside your file (Mixamo names are the default).
 * The animator, look-at, wave intro and groove reaction all work through the
 * same AvatarRig interface, so nothing else needs to change.
 */
export type AvatarSource = 'procedural' | 'glb';

export const AVATAR_CONFIG = {
  source: 'procedural' as AvatarSource,

  glb: {
    /** Path relative to the site base (public/ folder). */
    url: 'models/vansh.glb',
    scale: 1,
    yOffset: 0,
    rotationY: 0,
    bones: {
      torso: 'mixamorigSpine2',
      head: 'mixamorigHead',
      leftUpperArm: 'mixamorigLeftArm',
      leftForearm: 'mixamorigLeftForeArm',
      leftHand: 'mixamorigLeftHand',
      rightUpperArm: 'mixamorigRightArm',
      rightForearm: 'mixamorigRightForeArm',
      rightHand: 'mixamorigRightHand',
    },
  },

  /** Palette sampled from the reference photo. */
  colors: {
    skin: '#c4855e',
    hair: '#17131f',
    kurta: '#abb4e4',
    kurtaStripeDark: '#959ed6',
    kurtaStripeLight: '#bfc6ec',
    collar: '#bcc4ec',
    pants: '#f7f5ee',
    shoes: '#5a3a2c',
    glasses: '#16121c',
    buttons: '#4a2f25',
    lips: '#6b3328',
    outline: '#221c3b',
    ground: '#cff5e4',
    road: '#ddd3ee',
    roadLine: '#ffc83d',
  },
};
