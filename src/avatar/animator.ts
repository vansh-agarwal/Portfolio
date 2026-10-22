import { Euler, MathUtils, Quaternion, Vector3 } from 'three';
import { aimBone, rotateInRootSpace, type ArmRig, type AvatarRig } from './rig';

type Dir = readonly [number, number, number];
/** Directions in torso space. X is "outward" and gets mirrored for the right arm. */
interface ArmPose {
  upper: Dir;
  fore: Dir;
}
type PoseName = 'rest' | 'crossedFront' | 'crossedBack' | 'wave';

const POSES: Record<PoseName, ArmPose> = {
  rest: { upper: [0.16, -1, 0.04], fore: [0.1, -1, 0.22] },
  // The left forearm sits in front, the right one tucks behind it.
  crossedFront: { upper: [-0.04, -1, 0.55], fore: [-1, 0.2, 0.4] },
  crossedBack: { upper: [-0.02, -1, 0.4], fore: [-1, 0.06, 0.22] },
  wave: { upper: [1, 0.3, 0.22], fore: [0.15, 1, 0.12] },
};

interface Key {
  t: number;
  left: PoseName;
  right: PoseName;
}
const CROSSED = { left: 'crossedFront', right: 'crossedBack' } as const;
/** Uncross, wave once with the right hand, recross. */
const INTRO: Key[] = [
  { t: 0, ...CROSSED },
  { t: 0.5, ...CROSSED },
  { t: 1.2, left: 'rest', right: 'rest' },
  { t: 1.65, left: 'rest', right: 'wave' },
  { t: 3.05, left: 'rest', right: 'wave' },
  { t: 3.5, left: 'rest', right: 'rest' },
  { t: 4.25, ...CROSSED },
];
const INTRO_END = INTRO[INTRO.length - 1].t;
const WAVE_ON = 1.2;
const WAVE_OFF = 3.5;
const GROOVE_LEN = 2.8;
const BPM = 116;

export interface AnimatorEvents {
  onWave?(waving: boolean): void;
}

export interface LookInput {
  x: number;
  y: number;
}

const _e = new Euler(0, 0, 0, 'YXZ');
const _q = new Quaternion();
const _torsoQ = new Quaternion();
const _dir = new Vector3();
const _dir2 = new Vector3();

export class AvatarAnimator {
  private time = 0;
  private introT = -1;
  private grooveT = -1;
  private waving = false;
  private look = { x: 0, y: 0 };
  private nextBlink = 2.5;
  private blinkT = -1;
  private readonly rest = new Map<object, Quaternion>();
  private readonly torsoRestY: number;

  constructor(
    private readonly rig: AvatarRig,
    private readonly events: AnimatorEvents = {},
  ) {
    const { torso, head, arms } = rig;
    for (const o of [torso, head, arms.left.upper, arms.left.fore, arms.right.upper, arms.right.fore]) {
      this.rest.set(o, o.quaternion.clone());
    }
    this.torsoRestY = torso.position.y;
  }

  playIntro(): void {
    this.introT = 0;
  }

  groove(): void {
    this.grooveT = 0;
  }

  get isGrooving(): boolean {
    return this.grooveT >= 0;
  }

  update(dt: number, target: LookInput): void {
    dt = Math.min(dt, 1 / 20);
    this.time += dt;
    const t = this.time;
    const { rig } = this;

    // --- timelines ---
    if (this.introT >= 0) {
      this.introT += dt;
      const shouldWave = this.introT >= WAVE_ON && this.introT < WAVE_OFF;
      if (shouldWave !== this.waving) {
        this.waving = shouldWave;
        this.events.onWave?.(shouldWave);
      }
      if (this.introT > INTRO_END) this.introT = -1;
    }
    let grooveEnv = 0;
    let beat = 0;
    if (this.grooveT >= 0) {
      this.grooveT += dt;
      const g = this.grooveT;
      grooveEnv = Math.min(1, g / 0.2) * Math.min(1, Math.max(0, (GROOVE_LEN - g) / 0.35));
      beat = g * (BPM / 60);
      if (g > GROOVE_LEN) this.grooveT = -1;
    }

    // --- look-at, smoothed ---
    const k = 1 - Math.exp(-dt * 6);
    this.look.x += (target.x - this.look.x) * k;
    this.look.y += (target.y - this.look.y) * k;
    const yaw = MathUtils.clamp(this.look.x, -1, 1) * 0.55;
    const pitch = MathUtils.clamp(-this.look.y, -1, 1) * 0.26;

    // --- torso: breathing, weight shift, a little follow ---
    const breath = Math.sin(t * 1.7);
    const shift = Math.sin(t * 0.55);
    const bob = grooveEnv * 0.014 * Math.abs(Math.sin(beat * Math.PI));
    rig.torso.position.y = this.torsoRestY - bob;
    rig.torso.scale.set(1 + breath * 0.006, 1 + breath * 0.011, 1 + breath * 0.012);
    _e.set(0, yaw * 0.18, shift * 0.022 + grooveEnv * 0.04 * Math.sin(beat * Math.PI * 0.5));
    rotateInRootSpace(rig.torso, this.rest.get(rig.torso)!, _q.setFromEuler(_e), rig.root);

    // --- head: cursor follow, nod to the beat ---
    const nod = grooveEnv * 0.16 * (0.5 - 0.5 * Math.cos(beat * Math.PI * 2));
    _e.set(pitch + nod + breath * 0.008, yaw * 0.82, -shift * 0.03 + grooveEnv * 0.07 * Math.sin(beat * Math.PI));
    rotateInRootSpace(rig.head, this.rest.get(rig.head)!, _q.setFromEuler(_e), rig.root);

    // --- arms ---
    rig.torso.getWorldQuaternion(_torsoQ);
    const pose = this.armPoses();
    this.poseArm(rig.arms.left, pose.left, 0);
    this.poseArm(rig.arms.right, pose.right, pose.waveWeight);

    // --- blink ---
    if (rig.eyes) {
      if (this.blinkT < 0 && t > this.nextBlink) this.blinkT = 0;
      let s = 1;
      if (this.blinkT >= 0) {
        this.blinkT += dt;
        s = Math.max(0.12, Math.abs(1 - this.blinkT / 0.07));
        if (this.blinkT > 0.14) {
          this.blinkT = -1;
          this.nextBlink = t + 2.5 + Math.random() * 3;
          s = 1;
        }
      }
      for (const eye of rig.eyes) eye.scale.y = 1.25 * s;
    }
  }

  private armPoses(): { left: ArmPose; right: ArmPose; waveWeight: number } {
    if (this.introT < 0) return { left: POSES.crossedFront, right: POSES.crossedBack, waveWeight: 0 };
    const t = this.introT;
    let i = 0;
    while (i < INTRO.length - 2 && t > INTRO[i + 1].t) i++;
    const a = INTRO[i];
    const b = INTRO[i + 1];
    const u = smoothstep(MathUtils.clamp((t - a.t) / (b.t - a.t), 0, 1));
    const waveWeight = (a.right === 'wave' ? 1 - u : 0) + (b.right === 'wave' ? u : 0);
    return {
      left: blend(POSES[a.left], POSES[b.left], u),
      right: blend(POSES[a.right], POSES[b.right], u),
      waveWeight: Math.min(1, waveWeight),
    };
  }

  private poseArm(arm: ArmRig, pose: ArmPose, waveWeight: number): void {
    const s = arm.side;
    const wag = waveWeight * Math.sin(this.time * Math.PI * 2 * 1.9) * 0.55;
    _dir.set(pose.upper[0] * s, pose.upper[1], pose.upper[2]).normalize().applyQuaternion(_torsoQ);
    aimBone(arm.upper, this.rest.get(arm.upper)!, arm.fore, _dir);
    _dir2.set((pose.fore[0] + wag) * s, pose.fore[1], pose.fore[2]).normalize().applyQuaternion(_torsoQ);
    aimBone(arm.fore, this.rest.get(arm.fore)!, arm.hand, _dir2);
  }
}

function smoothstep(x: number): number {
  return x * x * (3 - 2 * x);
}

function blend(a: ArmPose, b: ArmPose, u: number): ArmPose {
  const mix = (p: Dir, q: Dir): Dir => [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u, p[2] + (q[2] - p[2]) * u];
  return { upper: mix(a.upper, b.upper), fore: mix(a.fore, b.fore) };
}
