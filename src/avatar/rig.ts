import { Object3D, Quaternion, Vector3 } from 'three';

/** One arm, as three joints in a chain: shoulder -> elbow -> wrist. */
export interface ArmRig {
  upper: Object3D;
  fore: Object3D;
  hand: Object3D;
  /** +1 for the character's left arm (+X when facing +Z), -1 for the right. */
  side: 1 | -1;
}

/**
 * Everything the animator needs. Both the procedural builder and the GLB loader
 * produce one of these, which is what makes the model swappable.
 */
export interface AvatarRig {
  /** Whole character, feet at y = 0, facing +Z. */
  root: Object3D;
  torso: Object3D;
  head: Object3D;
  arms: { left: ArmRig; right: ArmRig };
  /** Optional eye meshes, scaled on Y to blink. */
  eyes?: Object3D[];
  /** Objects the click/tap raycast tests against. */
  hitTargets: Object3D[];
}

const _q = new Quaternion();
const _q2 = new Quaternion();
const _a = new Vector3();
const _b = new Vector3();

/**
 * Rotate `bone` (starting from its rest pose) by `delta`, where `delta` is
 * expressed in the avatar root's space. Works for any bone orientation, so it
 * behaves the same for procedural groups and arbitrary GLB skeletons.
 */
export function rotateInRootSpace(bone: Object3D, rest: Quaternion, delta: Quaternion, root: Object3D): void {
  bone.quaternion.copy(rest);
  bone.updateMatrixWorld(true);
  const rootQ = root.getWorldQuaternion(_q2);
  // worldDelta = rootQ * delta * rootQ^-1
  const worldDelta = _q.copy(rootQ).multiply(delta).multiply(rootQ.invert());
  applyWorldRotation(bone, worldDelta);
}

/**
 * Point the segment `bone -> child` along `worldDir`, starting from the rest pose.
 */
export function aimBone(bone: Object3D, rest: Quaternion, child: Object3D, worldDir: Vector3): void {
  bone.quaternion.copy(rest);
  bone.updateMatrixWorld(true);
  const from = bone.getWorldPosition(_a);
  const current = child.getWorldPosition(_b).sub(from).normalize();
  const worldDelta = _q.setFromUnitVectors(current, worldDir);
  applyWorldRotation(bone, worldDelta);
}

const _w = new Quaternion();
const _p = new Quaternion();
function applyWorldRotation(bone: Object3D, worldDelta: Quaternion): void {
  const world = bone.getWorldQuaternion(_w);
  const target = world.premultiply(worldDelta);
  const parentWorld = bone.parent ? bone.parent.getWorldQuaternion(_p) : _p.identity();
  bone.quaternion.copy(parentWorld.invert().multiply(target));
  bone.updateMatrixWorld(true);
}
