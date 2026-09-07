import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { Gear, Profile } from '@/lib/model';
import { worn } from '@/lib/outfit';
import Doll from './doll';

function Character({profile:p,gear}:{profile:Profile;gear:Gear[]}) {
  const host=useRef<HTMLDivElement>(null), rotation=useRef(0.12);
  const [failed,setFailed]=useState(false);
  useEffect(()=>{
    const el=host.current; if(!el)return;
    let renderer: THREE.WebGLRenderer;
    try { renderer=new THREE.WebGLRenderer({antialias:true,alpha:true}); } catch {setFailed(true);return;}
    setFailed(false);
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.35;
    renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(29,1,.1,30);camera.position.set(0,1.14,4.5);camera.lookAt(0,.95,0);
    scene.add(new THREE.HemisphereLight('#fff9f1','#758491',2.5));
    const key=new THREE.DirectionalLight('#fff4e8',4);key.position.set(-2,4,4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-2;key.shadow.camera.right=2;key.shadow.camera.top=3;key.shadow.camera.bottom=-1;key.shadow.bias=-.001;scene.add(key);
    const rim=new THREE.DirectionalLight('#c6e2ff',2.8);rim.position.set(2,3,-2);scene.add(rim);
    const fill=new THREE.DirectionalLight('#ffe0d2',1);fill.position.set(2,1,3);scene.add(fill);
    const figure=new THREE.Group();scene.add(figure);figure.rotation.y=rotation.current;
    figure.scale.set(.92+(p.weight-35)/430,.9+(p.height-140)/500,1);
    const material=(color:string,roughness=.65)=>new THREE.MeshStandardMaterial({color,roughness});
    const skin=material(p.skin,.52),top=material(worn(p,gear,'top')?.color||p.top),bottom=material(worn(p,gear,'bottom')?.color||p.bottom),shoe=material(worn(p,gear,'shoes')?.color||p.shoes,.45);
    const hair=material('#352925',.42),hairLight=material('#5b4033',.45),white=material('#f5f5ee',.25),iris=material('#806745',.25),pupil=material('#161a20',.16),lip=material('#b97773',.48);
    const mesh=(geometry:THREE.BufferGeometry,m:THREE.Material,x:number,y:number,z:number,parent:THREE.Object3D=figure)=>{const o=new THREE.Mesh(geometry,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;};
    const ellipsoid=(x:number,y:number,z:number,sx:number,sy:number,sz:number,m:THREE.Material)=>{const o=mesh(new THREE.SphereGeometry(1,32,24),m,x,y,z);o.scale.set(sx,sy,sz);return o;};
    const limb=(a:number[],b:number[],r1:number,r2:number,m:THREE.Material)=>{const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),dir=bv.clone().sub(av);const o=mesh(new THREE.CylinderGeometry(r1,r2,dir.length(),32),m,...av.add(bv).multiplyScalar(.5).toArray() as [number,number,number]);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());return o;};
    const curve=(points:number[][],radius:number,m:THREE.Material)=>mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v))),32,radius,8,false),m,0,0,0);
    const torso=(rings:number[][],depth:number,m:THREE.Material)=>{const o=mesh(new THREE.LatheGeometry(rings.map(([r,y])=>new THREE.Vector2(r,y)),48),m,0,0,0);o.scale.z=depth;return o;};
    // Continuous sculpted torso, tapered legs and articulated arms.
    torso([[0,.85],[.135,.86],[.165,.9],[.151,.98],[.14,1.04],[.178,1.16],[.189,1.22],[.158,1.3],[.064,1.34],[0,1.34]],.66,top);
    torso([[0,.75],[.16,.77],[.183,.86],[.166,.91],[.15,.94],[0,.94]],.65,bottom);
    limb([0,1.29,0],[0,1.43,0],.048,.061,skin);
    for(const sign of [-1,1]){
      const hip=sign*.085,knee=sign*.108,ankle=sign*.113;
      limb([hip,.82,0],[knee,.51,.015],.065,.09,bottom);
      ellipsoid(knee,.51,.015,.067,.07,.063,bottom);
      limb([knee,.51,.015],[ankle,.13,0],.036,.064,bottom);
      ellipsoid(ankle,.1,.025,.041,.045,.05,white);
      const foot=ellipsoid(ankle,.056,.07,.063,.049,.112,shoe);foot.rotation.y=sign*-.08;
      ellipsoid(ankle,.024,.07,.065,.02,.114,white);
      ellipsoid(ankle,.072,.118,.037,.021,.037,shoe);
      for(let i=0;i<4;i++) curve([[ankle-.029,.092-i*.003,.065+i*.014],[ankle,.098-i*.003,.074+i*.014],[ankle+.029,.092-i*.003,.065+i*.014]],.0025,white);
      ellipsoid(sign*.177,1.248,0,.065,.083,.076,top);
      limb([sign*.185,1.255,0],[sign*.23,1.11,.002],.045,.061,top);
      limb([sign*.23,1.11,.002],[sign*.261,.95,.016],.033,.044,skin);
      ellipsoid(sign*.262,.947,.016,.034,.041,.034,skin);
      limb([sign*.263,.96,.016],[sign*.29,.795,.046],.023,.034,skin);
      const hand=ellipsoid(sign*.293,.759,.043,.031,.051,.022,skin);hand.rotation.z=sign*.12;
      for(let i=0;i<4;i++)limb([sign*(.277+i*.01),.743,.052],[sign*(.28+i*.01),.707+Math.abs(i-1.5)*.005,.057],.0055,.007,skin);
      limb([sign*.27,.775,.064],[sign*.265,.74,.071],.009,.012,skin);
      curve([[sign*.168,.876,.085],[sign*.138,.867,.109],[sign*.09,.866,.117]],.0025,material('#ffffff'));
    }
    // Neckline, garment seams and small sport details.
    curve([[-.06,1.316,.022],[-.052,1.284,.064],[0,1.271,.103],[.052,1.284,.064],[.06,1.316,.022]],.006,top);
    curve([[-.143,.973,.038],[0,.96,.098],[.143,.973,.038]],.003,material('#ffffff'));
    curve([[.072,1.193,.112],[.099,1.19,.11],[.119,1.209,.097]],.004,white);
    // A shaped jaw and dimensional eye sockets replace the flat doll face.
    const fw=.077+p.face/5000;
    ellipsoid(0,1.521,0,fw,.116,.084,skin);
    ellipsoid(0,1.46,.03,fw*.76,.061,.063,skin);
    ellipsoid(0,1.424,.04,.031,.019,.029,skin);
    ellipsoid(0,1.491,.083,.012,.024,.016,skin);
    ellipsoid(0,1.476,.091,.016,.01,.015,skin);
    for(const sign of [-1,1]){
      const ex=sign*(.028+p.eyes/9000);
      ellipsoid(sign*(fw+.002),1.509,-.007,.014,.025,.013,skin);
      ellipsoid(ex,1.519,.071,.02,.013,.011,white);
      ellipsoid(ex,1.519,.081,.0085,.0095,.0045,iris);
      ellipsoid(ex,1.52,.085,.0043,.006,.002,pupil);
      ellipsoid(ex-.003,1.524,.087,.0026,.0028,.001,white);
      curve([[ex-.019,1.518,.074],[ex-.011,1.53,.079],[ex+.006,1.532,.079],[ex+.02,1.521,.073]],.0026,hair);
      curve([[ex-.016,1.544,.069],[ex-.002,1.549,.074],[ex+.015,1.544,.067]],.0038,hair);
    }
    curve([[-.019,1.453,.082],[-.007,1.456,.088],[0,1.454,.09],[.007,1.456,.088],[.019,1.453,.082]],.0038,lip);
    curve([[-.016,1.451,.084],[0,1.447,.09],[.016,1.451,.084]],.0032,lip);
    if(p.hair!=='光头'){
      // Sculpted crown, swept fringe and ponytail with separate locks.
      ellipsoid(0,1.603,-.019,fw*1.08,.055,.084,hair);
      ellipsoid(0,1.548,-.066,fw*.96,.084,.043,hair);
      for(let i=0;i<9;i++){
        const x=(i-4)*.017;
        curve([[x*.7,1.635,-.015],[x,1.612,.047],[x*.82-.022,1.568+Math.abs(i-4)*.002,.068]],.009-i*.0003,i%3===0?hairLight:hair);
      }
      for(const sign of [-1,1])curve([[sign*fw*.9,1.582,0],[sign*fw,1.54,.001],[sign*fw*.97,1.494,.003]],.008,hair);
      if(p.hair==='长发'){
        ellipsoid(.016,1.59,-.12,.047,.049,.048,hair);
        for(let i=0;i<5;i++)curve([[.016+(i-2)*.012,1.59,-.133],[.041+(i-2)*.014,1.48,-.168],[.063+(i-2)*.01,1.335,-.139],[.034+(i-2)*.009,1.25,-.095]],.017,i%2?hair:hairLight);
      }
    }
    if(p.accessory||worn(p,gear,'accessory')){
      const bag=material(worn(p,gear,'accessory')?.color||'#a68b6b');
      ellipsoid(0,1.112,-.145,.126,.172,.064,bag);
      for(const sign of [-1,1])curve([[sign*.104,.977,.081],[sign*.139,1.184,.079],[sign*.125,1.286,.003],[sign*.104,1.23,-.13]],.014,bag);
    }
    const ground=mesh(new THREE.CylinderGeometry(.37,.39,.035,64),material('#e5e1d9'),0,-.018,0,scene);ground.receiveShadow=true;
    const resize=()=>{const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();};
    const observer=new ResizeObserver(resize);observer.observe(el);resize();
    let dragging=false,start=0,frame=0;
    const down=(e:PointerEvent)=>{dragging=true;start=e.clientX;el.setPointerCapture(e.pointerId);};
    const move=(e:PointerEvent)=>{if(dragging){rotation.current+=(e.clientX-start)*.009;start=e.clientX;figure.rotation.y=rotation.current;}};
    const up=()=>{dragging=false;};
    const keyboard=(e:KeyboardEvent)=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();rotation.current+=(e.key==='ArrowLeft'?-.18:.18);figure.rotation.y=rotation.current;}if(e.key==='Home'){rotation.current=0;figure.rotation.y=0;}};
    el.addEventListener('pointerdown',down);el.addEventListener('pointermove',move);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);el.addEventListener('keydown',keyboard);
    const draw=()=>{renderer.render(scene,camera);frame=requestAnimationFrame(draw);};draw();
    return()=>{cancelAnimationFrame(frame);observer.disconnect();el.removeEventListener('pointerdown',down);el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',up);el.removeEventListener('keydown',keyboard);const mats=new Set<THREE.Material>();scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])mats.add(m);}});mats.forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove();};
  },[p,gear]);
  return <div className="game-character-canvas" ref={host} role="img" tabIndex={0} aria-label="可拖动旋转的三维运动角色，左右方向键旋转，Home 键回到正面">{failed&&<p className="avatar-error">当前设备无法显示 3D，请切换到照片换装。</p>}</div>;
}
export default function GameCharacter({profile,gear}:{profile:Profile;gear:Gear[]}){
  const [mode,setMode]=useState<'game'|'photo'>('game');
  return <div className="character-viewer">
    <div className="character-view-tabs" role="group" aria-label="人物预览模式"><button aria-pressed={mode==='game'} onClick={()=>setMode('game')}>3D 角色</button><button aria-pressed={mode==='photo'} onClick={()=>setMode('photo')}>照片换装</button></div>
    {mode==='game'?<Character profile={profile} gear={gear}/>:<Doll profile={profile} gear={gear}/>}
    <p className="character-view-note">{mode==='game'?'拖动旋转角色 · 3D 基础版型展示体型、配色与配件':'实物图片换装 · 在右侧调整装备的位置与大小'}</p>
  </div>;
}
