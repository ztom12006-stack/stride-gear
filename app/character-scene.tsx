import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { Gear, Profile } from '@/lib/model';
import { worn } from '@/lib/outfit';

// Connected elliptical rings: height, centreX, centreZ, width, depth.
type Ring = [number, number, number, number, number];
function surface(rings: Ring[], segments = 40) {
  const points: number[] = [], indices: number[] = [];
  rings.forEach(([y, x, z, rx, rz], row) => {
    for (let i = 0; i <= segments; i++) {
      const theta = i / segments * Math.PI * 2;
      points.push(x + rx * Math.cos(theta), y, z + rz * Math.sin(theta));
      if (row < rings.length - 1 && i < segments) {
        const a = row * (segments + 1) + i, b = a + segments + 1;
        indices.push(a, b, b + 1, a, b + 1, a + 1);
      }
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

function buildFigure(p: Profile, gear: Gear[]) {
  const root = new THREE.Group(), body = new THREE.Group(), head = new THREE.Group();
  root.add(body, head);
  const mat = (color: string) => new THREE.MeshStandardMaterial({ color, roughness: .85 });
  const skin = mat(p.skin), top = mat(worn(p, gear, 'top')?.color || p.top);
  const bottom = mat(worn(p, gear, 'bottom')?.color || p.bottom), shoe = mat(worn(p, gear, 'shoes')?.color || p.shoes);
  const sole = mat('#edece6'), dark = mat('#393330'), hair = mat('#39302c');
  const mesh = (g: THREE.BufferGeometry, m: THREE.Material, parent = body) => {
    const object = new THREE.Mesh(g, m); object.castShadow = true; object.receiveShadow = true;
    parent.add(object); return object;
  };
  const oval = (x: number, y: number, z: number, rx: number, ry: number, rz: number, m: THREE.Material, parent = body) => {
    const object = mesh(new THREE.SphereGeometry(1, 32, 24), m, parent);
    object.position.set(x, y, z); object.scale.set(rx, ry, rz); return object;
  };
  const pipe = (points: number[][], radius: number, m: THREE.Material, parent = body) => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((v) => new THREE.Vector3(v[0], v[1], v[2]))), 28, radius, 8, false), m, parent);
  mesh(surface([
    [.92,0,0,0,0], [.94,0,0,.141,.082], [1.02,0,0,.15,.086], [1.13,0,0,.14,.08],
    [1.27,0,0,.175,.095], [1.37,0,0,.19,.10], [1.42,0,0,.178,.087],
    [1.46,0,0,.105,.065], [1.475,0,0,.057,.052],
  ]), top);
  mesh(surface([[.845,0,0,.06,.07],[.89,0,0,.15,.089],[.96,0,0,.151,.09],[.975,0,0,.144,.085]]), bottom);
  mesh(surface([[1.445,0,0,.047,.045],[1.49,0,0,.047,.046],[1.555,0,0,.04,.04]]), skin);
  for (const s of [-1, 1]) {
    mesh(surface([[1.258,s*.237,.002,.053,.054],[1.30,s*.224,0,.058,.061],[1.38,s*.185,0,.071,.073],[1.423,s*.15,0,.055,.058],[1.435,s*.134,0,.02,.02]]), top);
    mesh(surface([[.87,s*.296,.012,.023,.024],[.95,s*.291,.008,.031,.033],[1.04,s*.277,0,.042,.039],[1.10,s*.269,-.005,.041,.04],[1.16,s*.262,-.004,.044,.046],[1.275,s*.235,0,.047,.048]]), skin);
    const hand = oval(s*.301,.818,.016,.028,.064,.022,skin); hand.rotation.z = s*.05;
    oval(s*.278,.834,.031,.012,.031,.013,skin);
    mesh(surface([[.10,s*.103,0,.03,.035],[.19,s*.105,0,.035,.04],[.31,s*.11,-.006,.049,.053],
      [.40,s*.111,-.003,.049,.053],[.49,s*.109,.011,.045,.048],[.56,s*.104,0,.056,.06],
      [.72,s*.091,0,.074,.077],[.85,s*.082,0,.078,.084],[.91,s*.078,0,.069,.075],[.935,s*.071,0,.045,.05]]), bottom);
    oval(s*.105,.098,.006,.034,.029,.04,sole);
    oval(s*.106,.045,.054,.053,.024,.102,sole);
    oval(s*.106,.07,.048,.05,.035,.097,shoe);
    oval(s*.106,.094,.02,.029,.012,.035,shoe);
    for (let i = 0; i < 3; i++) pipe([[s*.106-.021,.099-i*.004,.042+i*.015],[s*.106,.105-i*.004,.048+i*.015],[s*.106+.021,.099-i*.004,.042+i*.015]],.0017,sole);
  }
  // A single head surface with a tapered jaw and understated, flush features.
  mesh(surface([[1.528,0,.02,0,0],[1.539,0,.022,.039,.035],[1.566,0,.012,.064,.06],
    [1.615,0,0,.085,.074],[1.667,0,-.004,.093,.082],[1.722,0,-.008,.088,.079],
    [1.761,0,-.01,.067,.061],[1.782,0,-.01,.033,.031],[1.788,0,-.01,0,0]]),skin,head);
  for (const s of [-1,1]) {
    oval(s*.089,1.649,-.004,.013,.024,.013,skin,head);
    const eyeX = s * (.031 + (p.eyes - 50) * .00007);
    oval(eyeX,1.661,.074,.009,.004,.0025,dark,head);
    pipe([[eyeX-.013,1.679,.073],[eyeX,1.682,.077],[eyeX+.013,1.68,.073]],.002,dark,head);
  }
  oval(0,1.638,.075,.008,.021,.009,skin,head);
  pipe([[-.015,1.594,.063],[0,1.591,.066],[.015,1.594,.063]],.0014,mat('#986856'),head);
  if (p.hair !== '光头') {
    const cap = mesh(new THREE.SphereGeometry(1,40,24,0,Math.PI*2,0,Math.PI*.55),hair,head);
    cap.position.set(0,1.716,-.01); cap.scale.set(.095,.079,.086);
    const fringe = oval(-.026,1.724,.064,.068,.027,.025,hair,head); fringe.rotation.z = -.2;
    if (p.hair === '长发') {
      oval(0,1.675,-.077,.084,.096,.026,hair,head);
      oval(0,1.731,-.1,.033,.037,.033,hair,head);
      pipe([[0,1.72,-.112],[.008,1.59,-.142],[.018,1.455,-.104]],.031,hair,head);
    }
  }
  const volume = THREE.MathUtils.clamp(1 + (p.weight - 68) * .0024, .92, 1.16);
  body.scale.set(volume,1,1 + (volume-1)*.65);
  head.scale.x = .97 + p.face * .0006;
  root.scale.setScalar(.94 + (p.height-140) / 700);
  pipe([[-.058,1.466,.015],[-.048,1.452,.047],[0,1.448,.055],[.048,1.452,.047],[.058,1.466,.015]],.003,sole);
  pipe([[.07,1.349,.092],[.087,1.34,.091],[.112,1.363,.079]],.0025,sole);
  if (p.accessory || worn(p,gear,'accessory')) {
    const bag = mat(worn(p,gear,'accessory')?.color || '#b39872');
    oval(0,1.268,-.135,.118,.176,.055,bag);
    for (const s of [-1,1]) pipe([[s*.108,1.1,.063],[s*.149,1.32,.074],[s*.117,1.447,.012],[s*.095,1.39,-.12]],.009,bag);
  }
  return root;
}

type SceneHandle = { update: (p: Profile, gear: Gear[]) => void; face: (angle: number) => void };
function disposeFigure(root: THREE.Object3D) {
  const materials = new Set<THREE.Material>();
  root.traverse((object) => { if (object instanceof THREE.Mesh) {
    object.geometry.dispose();
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
  } });
  materials.forEach((material) => material.dispose());
}
export default function CharacterScene({ profile, gear, angle, reset }: { profile: Profile; gear: Gear[]; angle: number; reset: number }) {
  const host = useRef<HTMLDivElement>(null), handle = useRef<SceneHandle | null>(null);
  const [failed,setFailed] = useState(false);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias:true,alpha:true }); }
    catch { setFailed(true); return; }
    setFailed(false);
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1,1,1,-1,.1,20);
    camera.position.set(0,1.12,5); camera.lookAt(0,.96,0);
    scene.add(new THREE.HemisphereLight('#fff8ef','#b3b8b4',2));
    const key = new THREE.DirectionalLight('#fff5e8',2.5); key.position.set(-2,4,4); key.castShadow = true;
    key.shadow.mapSize.set(1024,1024); key.shadow.camera.left=-1; key.shadow.camera.right=1;
    key.shadow.camera.top=2.5; key.shadow.camera.bottom=-1; key.shadow.bias=-.0005; scene.add(key);
    const fill = new THREE.DirectionalLight('#e5edff',1.5); fill.position.set(3,2,-2); scene.add(fill);
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.025,64), new THREE.MeshStandardMaterial({color:'#e5e4dc',roughness:1}));
    floor.position.y = -.025; floor.receiveShadow = true; scene.add(floor);
    let figure: THREE.Group | undefined, rotation = 0;
    const draw = () => renderer.render(scene,camera);
    const resize = () => {
      const {clientWidth:w,clientHeight:h} = el;
      if (!w || !h) return;
      renderer.setSize(w,h);
      const halfHeight = Math.max(1.13, .57 / (w/h));
      camera.top=halfHeight; camera.bottom=-halfHeight; camera.left=-halfHeight*w/h; camera.right=halfHeight*w/h;
      camera.updateProjectionMatrix(); draw();
    };
    handle.current = {
      update: (p,items) => { if (figure) { scene.remove(figure); disposeFigure(figure); } figure = buildFigure(p,items); figure.rotation.y=rotation; scene.add(figure); draw(); },
      face: (value) => { rotation=value; if (figure) figure.rotation.y=value; draw(); },
    };
    const observer = new ResizeObserver(resize); observer.observe(el); resize();
    let pointer: number | null = null, lastX = 0;
    const down = (event: PointerEvent) => { if (pointer !== null) return; pointer=event.pointerId; lastX=event.clientX; el.setPointerCapture(pointer); };
    const move = (event: PointerEvent) => { if (pointer !== event.pointerId) return; rotation += (event.clientX-lastX)*.008; lastX=event.clientX; handle.current?.face(rotation); };
    const up = () => { pointer=null; };
    const keyboard = (event: KeyboardEvent) => { if (['ArrowLeft','ArrowRight','Home'].includes(event.key)) { event.preventDefault(); handle.current?.face(event.key === 'Home' ? 0 : rotation + (event.key === 'ArrowLeft' ? -.15 : .15)); } };
    const lost = (event: Event) => { event.preventDefault(); setFailed(true); };
    el.addEventListener('pointerdown',down); el.addEventListener('pointermove',move); el.addEventListener('pointerup',up); el.addEventListener('pointercancel',up); el.addEventListener('lostpointercapture',up); el.addEventListener('keydown',keyboard);
    renderer.domElement.addEventListener('webglcontextlost',lost);
    return () => {
      handle.current=null; observer.disconnect();
      el.removeEventListener('pointerdown',down); el.removeEventListener('pointermove',move); el.removeEventListener('pointerup',up); el.removeEventListener('pointercancel',up); el.removeEventListener('lostpointercapture',up); el.removeEventListener('keydown',keyboard);
      renderer.domElement.removeEventListener('webglcontextlost',lost);
      disposeFigure(scene); key.shadow.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, []);
  useEffect(() => { handle.current?.update(profile,gear); }, [profile,gear]);
  useEffect(() => { handle.current?.face(angle); }, [angle,reset]);
  return <div className="character-stage-wrap">
    <span className="character-watermark" aria-hidden="true">FORM<br/>STUDY.</span>
    <div className="game-character-canvas" ref={host} tabIndex={0} role="img" aria-label="三维比例人台，可拖动旋转，方向键旋转，Home 回正面" />
    {failed && <p role="status" className="character-fallback">当前设备无法显示 3D，请使用上方的装备平铺或照片叠搭。</p>}
    <span className="character-measure">{profile.height} CM <i/> {profile.weight} KG</span>
  </div>;
}
