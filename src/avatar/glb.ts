import { Group, Object3D } from 'three';
import { AVATAR_CONFIG } from './config';
import type { AvatarRig } from './rig';

/**
 * Loads a rigged .glb and maps its bones onto the AvatarRig interface.
 * Only bundled when AVATAR_CONFIG.source is 'glb' (it's dynamically imported).
 */
export async function loadGlbAvatar(): Promise<AvatarRig> {
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const cfg = AVATAR_CONFIG.glb;
  const gltf = await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}${cfg.url}`);

  const model = gltf.scene;
  model.scale.setScalar(cfg.scale);
  model.position.y = cfg.yOffset;
  model.rotation.y = cfg.rotationY;

  const root = new Group();
  root.name = 'vansh-glb';
  root.add(model);

  const bone = (name: string): Object3D => {
    const found = model.getObjectByName(name);
    if (!found) throw new Error(`Bone "${name}" not found in ${cfg.url}. Update AVATAR_CONFIG.glb.bones.`);
    return found;
  };
  const b = cfg.bones;

  return {
    root,
    torso: bone(b.torso),
    head: bone(b.head),
    arms: {
      left: { upper: bone(b.leftUpperArm), fore: bone(b.leftForearm), hand: bone(b.leftHand), side: 1 },
      right: { upper: bone(b.rightUpperArm), fore: bone(b.rightForearm), hand: bone(b.rightHand), side: -1 },
    },
    hitTargets: [model],
  };
}
