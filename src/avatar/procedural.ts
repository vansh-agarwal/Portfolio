import {
  BackSide,
  BufferGeometry,
  CanvasTexture,
  CapsuleGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DataTexture,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  NearestFilter,
  Object3D,
  Path,
  RedFormat,
  RepeatWrapping,
  SRGBColorSpace,
  Shape,
  ShaderMaterial,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  BoxGeometry,
} from 'three';
import { AVATAR_CONFIG } from './config';
import type { ArmRig, AvatarRig } from './rig';

const C = AVATAR_CONFIG.colors;

export interface BuildOptions {
  /** Geometry detail multiplier. 1 on desktop, lower on phones. */
  detail: number;
}

/**
 * Builds a stylized Vansh from primitives. Units are roughly metres,
 * feet at y = 0, facing +Z (toward the camera).
 */
export function buildProceduralAvatar({ detail }: BuildOptions): AvatarRig {
  const seg = (n: number) => Math.max(6, Math.round(n * detail));

  const gradient = makeToonGradient();
  const toon = (color: string, map?: CanvasTexture) =>
    new MeshToonMaterial({ color: map ? '#ffffff' : color, ...(map && { map }), gradientMap: gradient });

  const mat = {
    skin: toon(C.skin),
    hair: toon(C.hair),
    kurta: toon(C.kurta, makeStripeTexture(1.5)),
    sleeve: toon(C.kurta, makeStripeTexture(0.5)),
    collar: toon(C.collar),
    pants: toon(C.pants),
    shoes: toon(C.shoes),
    glasses: new MeshToonMaterial({ color: C.glasses, gradientMap: gradient }),
    dark: new MeshBasicMaterial({ color: C.hair }),
    buttons: new MeshBasicMaterial({ color: C.buttons }),
    lips: new MeshBasicMaterial({ color: C.lips }),
    lens: new MeshBasicMaterial({ color: '#e3f2ff', transparent: true, opacity: 0.1, depthWrite: false }),
  };
  const outlineBody = makeOutlineMaterial(0.0085);
  const outlineFine = makeOutlineMaterial(0.0045);

  const hitTargets: Object3D[] = [];
  const mesh = (geo: BufferGeometry, m: Material, outline?: ShaderMaterial) => {
    const me = new Mesh(geo, m);
    if (outline) me.add(new Mesh(geo, outline));
    hitTargets.push(me);
    return me;
  };

  const root = new Group();
  root.name = 'vansh';

  // ---------- legs (white pants) and shoes ----------
  for (const s of [-1, 1]) {
    const leg = mesh(new CapsuleGeometry(0.076, 0.6, seg(4), seg(14)), mat.pants, outlineBody);
    leg.position.set(0.085 * s, 0.44, 0);
    leg.rotation.z = 0.02 * s;
    root.add(leg);

    const shoe = mesh(new SphereGeometry(1, seg(16), seg(10)), mat.shoes, outlineBody);
    shoe.scale.set(0.068, 0.045, 0.12);
    shoe.position.set(0.09 * s, 0.04, 0.035);
    root.add(shoe);
  }

  // ---------- torso pivot (at the hips) ----------
  const torso = new Group();
  torso.name = 'torso';
  torso.position.y = 0.92;
  root.add(torso);

  // Kurta: a lathe profile (radius, height) flattened front to back.
  const profile = [
    [0.24, -0.4],
    [0.232, -0.3],
    [0.215, -0.12],
    [0.202, 0.04],
    [0.197, 0.18],
    [0.206, 0.32],
    [0.212, 0.42],
    [0.203, 0.5],
    [0.175, 0.56],
    [0.115, 0.6],
    [0.06, 0.62],
  ].map(([r, y]) => new Vector2(r, y));
  const kurta = mesh(new LatheGeometry(profile, seg(40)), mat.kurta, outlineBody);
  kurta.scale.z = 0.68;
  torso.add(kurta);

  // Mandarin collar
  const collar = mesh(new CylinderGeometry(0.058, 0.066, 0.055, seg(24), 1, true), mat.collar, outlineFine);
  collar.position.y = 0.625;
  collar.scale.z = 0.92;
  torso.add(collar);

  // Short placket with three buttons
  const placket = mesh(new BoxGeometry(0.034, 0.17, 0.01), mat.collar, outlineFine);
  placket.position.set(0, 0.47, 0.142);
  placket.rotation.x = -0.12;
  torso.add(placket);
  for (let i = 0; i < 3; i++) {
    const b = new Mesh(new SphereGeometry(0.0085, 8, 6), mat.buttons);
    b.position.set(0, 0.52 - i * 0.045, 0.151 - i * 0.004);
    torso.add(b);
  }

  // Neck
  const neck = mesh(new CylinderGeometry(0.044, 0.048, 0.09, seg(16)), mat.skin, outlineFine);
  neck.position.y = 0.655;
  torso.add(neck);

  // ---------- head ----------
  const head = new Group();
  head.name = 'head';
  head.position.y = 0.675;
  // Stylized proportions: a slightly oversized head reads friendlier.
  head.scale.setScalar(1.32);
  torso.add(head);
  const eyes = buildHead(head, mat, outlineBody, outlineFine, mesh, seg);

  // ---------- arms ----------
  const buildArm = (side: 1 | -1): ArmRig => {
    const upper = new Group();
    upper.position.set(0.205 * side, 0.485, 0);
    torso.add(upper);

    const cap = mesh(new SphereGeometry(0.05, seg(16), seg(12)), mat.sleeve, outlineBody);
    upper.add(cap);
    const upperArm = mesh(new CapsuleGeometry(0.054, 0.2, seg(4), seg(14)), mat.sleeve, outlineBody);
    upperArm.position.y = -0.135;
    upper.add(upperArm);

    const fore = new Group();
    fore.position.y = -0.27;
    upper.add(fore);
    const forearm = mesh(new CapsuleGeometry(0.049, 0.22, seg(4), seg(14)), mat.sleeve, outlineBody);
    forearm.position.y = -0.135;
    fore.add(forearm);

    const hand = new Group();
    hand.position.y = -0.285;
    fore.add(hand);
    const cuff = new Mesh(new TorusGeometry(0.046, 0.009, 6, seg(18)), mat.collar);
    cuff.rotation.x = Math.PI / 2;
    cuff.position.y = 0.012;
    hand.add(cuff);
    const palm = mesh(new SphereGeometry(1, seg(14), seg(10)), mat.skin, outlineFine);
    palm.scale.set(0.042, 0.055, 0.03);
    palm.position.y = -0.04;
    hand.add(palm);
    const thumb = mesh(new CapsuleGeometry(0.012, 0.025, 3, 8), mat.skin, outlineFine);
    thumb.position.set(0.0, -0.03, 0.03);
    thumb.rotation.x = 0.6;
    hand.add(thumb);

    return { upper, fore, hand, side };
  };

  const left = buildArm(1);
  const right = buildArm(-1);

  return { root, torso, head, arms: { left, right }, eyes, hitTargets };
}

type MeshFn = (geo: BufferGeometry, m: Material, outline?: ShaderMaterial) => Mesh;

function buildHead(
  head: Group,
  mat: Record<string, Material>,
  outlineBody: ShaderMaterial,
  outlineFine: ShaderMaterial,
  mesh: MeshFn,
  seg: (n: number) => number,
): Object3D[] {
  // skull and a narrower jaw
  const skull = mesh(new SphereGeometry(0.118, seg(28), seg(22)), mat.skin, outlineBody);
  skull.scale.set(0.92, 1.08, 0.98);
  skull.position.y = 0.13;
  head.add(skull);
  const jaw = mesh(new SphereGeometry(0.094, seg(22), seg(16)), mat.skin, outlineBody);
  jaw.scale.set(0.94, 0.88, 1);
  jaw.position.set(0, 0.082, 0.012);
  head.add(jaw);

  for (const s of [-1, 1]) {
    const ear = mesh(new SphereGeometry(0.03, seg(12), seg(10)), mat.skin, outlineFine);
    ear.scale.set(0.55, 1, 0.8);
    ear.position.set(0.108 * s, 0.125, -0.008);
    head.add(ear);
  }

  // eyes (brows hide under the fringe, like in the photo), nose, smirk
  const eyes: Object3D[] = [];
  for (const s of [-1, 1]) {
    const eye = new Mesh(new SphereGeometry(0.0125, 12, 10), mat.dark);
    eye.scale.set(1, 1.25, 0.6);
    eye.position.set(0.04 * s, 0.136, 0.105);
    head.add(eye);
    eyes.push(eye);

    const shine = new Mesh(new SphereGeometry(0.0035, 6, 4), new MeshBasicMaterial({ color: '#ffffff' }));
    shine.position.set(0.004, 0.006, 0.006);
    eye.add(shine);

  }

  const nose = mesh(new SphereGeometry(0.019, seg(12), seg(10)), mat.skin);
  nose.scale.set(0.85, 1, 0.95);
  nose.position.set(0, 0.11, 0.113);
  head.add(nose);

  // A calm smirk: the right corner (viewer's left) stays put, the left one lifts.
  const smirkCurve = new CatmullRomCurve3([
    new Vector3(-0.028, 0.071, 0.107),
    new Vector3(-0.005, 0.066, 0.111),
    new Vector3(0.02, 0.07, 0.109),
    new Vector3(0.034, 0.079, 0.102),
  ]);
  head.add(new Mesh(new TubeGeometry(smirkCurve, 16, 0.0042, 6), mat.lips));

  // ---------- glasses: black rectangular frames ----------
  const glasses = new Group();
  glasses.position.set(0, 0.137, 0.12);
  head.add(glasses);
  const frameGeo = rectFrameGeometry(0.074, 0.052, 0.007, 0.012);
  for (const s of [-1, 1]) {
    const frame = new Mesh(frameGeo, mat.glasses);
    frame.position.set(0.042 * s, 0, 0);
    frame.rotation.y = 0.08 * s;
    glasses.add(frame);
    const lens = new Mesh(new BoxGeometry(0.062, 0.04, 0.001), mat.lens);
    lens.position.set(0.042 * s, 0, 0.002);
    glasses.add(lens);
    const temple = new Mesh(new BoxGeometry(0.007, 0.008, 0.13), mat.glasses);
    temple.position.set(0.081 * s, 0.006, -0.065);
    temple.rotation.y = -0.18 * s;
    glasses.add(temple);
  }
  const bridge = new Mesh(new BoxGeometry(0.014, 0.007, 0.007), mat.glasses);
  bridge.position.set(0, 0.009, 0.004);
  glasses.add(bridge);

  // ---------- hair: a thick cap plus a side-swept fringe ----------
  const hairGroup = new Group();
  head.add(hairGroup);
  const cap = mesh(new SphereGeometry(0.128, seg(28), seg(18), 0, Math.PI * 2, 0, 1.78), mat.hair, outlineBody);
  cap.scale.set(1.0, 0.92, 1.06);
  cap.position.set(0, 0.162, -0.012);
  cap.rotation.x = -0.38;
  hairGroup.add(cap);

  const lockGeo = new SphereGeometry(1, seg(16), seg(12));
  // [x, y, z, sx, sy, sz, rotZ, rotX]
  const locks: number[][] = [
    [0.01, 0.238, 0.02, 0.112, 0.055, 0.105, 0.12, 0], // volume on top
    [0.055, 0.215, 0.085, 0.082, 0.04, 0.05, 0.34, 0.2],
    [0.0, 0.198, 0.1, 0.08, 0.035, 0.042, 0.42, 0.25],
    [-0.05, 0.179, 0.098, 0.07, 0.032, 0.04, 0.56, 0.25],
    [-0.088, 0.16, 0.074, 0.045, 0.034, 0.04, 0.9, 0.2],
    [0.092, 0.19, 0.055, 0.04, 0.045, 0.045, 0.1, 0],
    [-0.1, 0.165, 0.035, 0.032, 0.055, 0.055, 0.2, 0],
    [0.104, 0.16, 0.0, 0.028, 0.05, 0.06, 0, 0],
  ];
  for (const [x, y, z, sx, sy, sz, rz, rx] of locks) {
    const lock = mesh(lockGeo, mat.hair, outlineFine);
    lock.position.set(x, y, z);
    lock.scale.set(sx, sy, sz);
    lock.rotation.set(rx, 0, rz);
    hairGroup.add(lock);
  }

  return eyes;
}

/** A rounded-rectangle ring, extruded slightly: one lens frame. */
function rectFrameGeometry(w: number, h: number, depth: number, thickness: number): ExtrudeGeometry {
  const rr = (s: Shape | Path, x: number, y: number, ww: number, hh: number, r: number) => {
    s.moveTo(x + r, y);
    s.lineTo(x + ww - r, y);
    s.quadraticCurveTo(x + ww, y, x + ww, y + r);
    s.lineTo(x + ww, y + hh - r);
    s.quadraticCurveTo(x + ww, y + hh, x + ww - r, y + hh);
    s.lineTo(x + r, y + hh);
    s.quadraticCurveTo(x, y + hh, x, y + hh - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
  };
  const shape = new Shape();
  rr(shape, -w / 2, -h / 2, w, h, 0.012);
  const hole = new Shape();
  rr(hole, -w / 2 + thickness, -h / 2 + thickness, w - thickness * 2, h - thickness * 2, 0.007);
  shape.holes.push(hole);
  return new ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 4 });
}

function makeToonGradient(): DataTexture {
  const tex = new DataTexture(new Uint8Array([120, 190, 255]), 3, 1, RedFormat);
  tex.minFilter = NearestFilter;
  tex.magFilter = NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

/** Fine vertical pinstripes like the kurta in the photo. */
function makeStripeTexture(repeat: number): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 8;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = C.kurta;
  ctx.fillRect(0, 0, 256, 8);
  for (let x = 0; x < 256; x += 8) {
    ctx.fillStyle = C.kurtaStripeDark;
    ctx.fillRect(x, 0, 1.5, 8);
    ctx.fillStyle = C.kurtaStripeLight;
    ctx.fillRect(x + 4, 0, 1, 8);
  }
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = RepeatWrapping;
  tex.repeat.set(repeat, 1);
  return tex;
}

/** Inverted-hull outline: render back faces pushed out along the normal. Cheap and phone-friendly. */
export function makeOutlineMaterial(thickness: number): ShaderMaterial {
  return new ShaderMaterial({
    side: BackSide,
    uniforms: {
      thickness: { value: thickness },
      color: { value: new Color(C.outline) },
    },
    vertexShader: /* glsl */ `
      uniform float thickness;
      void main() {
        // Offset in view space so the line weight is the same for scaled meshes.
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        mv.xyz += normalize(normalMatrix * normal) * thickness;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 color;
      void main() {
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
}
