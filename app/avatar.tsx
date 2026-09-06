'use client';
import { useEffect, useRef, useState } from 'react';
import type { Profile } from '@/lib/model';
import * as THREE from 'three';
export default function Avatar({ profile: p }: { profile: Profile }) {
  const host = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!host.current) return;
    const el = host.current;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setError(true);
      return;
    }
    setError(false);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 1.05, 4.8);
    camera.lookAt(0, 0.96, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x5a6478, 2.5));
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(3, 5, 4);
    scene.add(light);
    const figure = new THREE.Group();
    figure.rotation.y = -0.22;
    figure.scale.set(0.86 + (p.weight - 35) / 190, p.height / 175, 1);
    scene.add(figure);
    const mat = (c: string) =>
      new THREE.MeshStandardMaterial({ color: c, roughness: 0.82 });
    const skin = mat(p.skin),
      top = mat(p.top),
      bottom = mat(p.bottom),
      shoe = mat(p.shoes),
      hair = mat('#27282e'),
      white = mat('#f5f5f1');
    const ball = (
      x: number,
      y: number,
      z: number,
      sx: number,
      sy: number,
      sz: number,
      m: THREE.Material,
    ) => {
      const o = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), m);
      o.position.set(x, y, z);
      o.scale.set(sx, sy, sz);
      figure.add(o);
      return o;
    };
    const limb = (
      a: number[],
      b: number[],
      r1: number,
      r2: number,
      m: THREE.Material,
    ) => {
      const av = new THREE.Vector3(...a),
        bv = new THREE.Vector3(...b),
        dir = bv.clone().sub(av);
      const o = new THREE.Mesh(
        new THREE.CylinderGeometry(r1, r2, dir.length(), 24),
        m,
      );
      o.position.copy(av.add(bv).multiplyScalar(0.5));
      o.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        dir.normalize(),
      );
      figure.add(o);
      return o;
    };
    ball(0, 1.13, 0, 0.26, 0.33, 0.145, top);
    limb([0, 0.89, 0], [0, 1.31, 0], 0.21, 0.245, top);
    ball(0, 0.84, 0, 0.225, 0.15, 0.14, bottom);
    limb([0, 1.38, 0], [0, 1.49, 0], 0.06, 0.068, skin);
    for (const sign of [-1, 1]) {
      ball(sign * 0.235, 1.32, 0, 0.105, 0.11, 0.1, top);
      limb([sign * 0.26, 1.31, 0], [sign * 0.335, 1.07, 0], 0.071, 0.092, top);
      limb(
        [sign * 0.335, 1.08, 0],
        [sign * 0.37, 0.82, 0.03],
        0.044,
        0.063,
        skin,
      );
      ball(sign * 0.37, 0.77, 0.03, 0.05, 0.075, 0.04, skin);
      limb(
        [sign * 0.115, 0.84, 0],
        [sign * 0.14, 0.61, 0],
        0.105,
        0.125,
        bottom,
      );
      limb([sign * 0.14, 0.61, 0], [sign * 0.15, 0.37, 0], 0.067, 0.088, skin);
      limb([sign * 0.15, 0.37, 0], [sign * 0.15, 0.12, 0], 0.043, 0.068, skin);
      ball(sign * 0.15, 0.125, 0, 0.052, 0.08, 0.053, white);
      ball(sign * 0.15, 0.067, 0.055, 0.078, 0.062, 0.14, shoe);
      ball(sign * 0.15, 0.027, 0.06, 0.08, 0.022, 0.145, white);
    }
    const fw = 0.098 + p.face / 1800;
    ball(0, 1.62, 0, fw, 0.155, 0.108, skin);
    ball(0, 1.54, 0.033, fw * 0.82, 0.068, 0.077, skin);
    ball(0, 1.616, 0.107, 0.02, 0.03, 0.028, skin);
    for (const sign of [-1, 1]) {
      const ex = sign * (0.028 + p.eyes / 3000);
      ball(ex, 1.653, 0.095, 0.012, 0.009, 0.009, white);
      ball(ex, 1.652, 0.103, 0.005, 0.006, 0.004, hair);
      ball(sign * (fw - 0.002), 1.618, 0, 0.021, 0.04, 0.022, skin);
    }
    ball(0, 1.561, 0.101, 0.023, 0.005, 0.003, mat('#865045'));
    if (p.hair !== '光头') {
      ball(0, 1.738, -0.008, fw * 1.06, 0.065, 0.105, hair);
      if (p.hair === '长发') {
        ball(0, 1.61, -0.092, fw * 1.09, 0.17, 0.07, hair);
        ball(0.1, 1.41, -0.095, 0.04, 0.14, 0.035, hair);
      }
    }
    if (p.accessory) {
      ball(0, 1.19, -0.18, 0.19, 0.245, 0.09, mat('#e4aa64'));
      for (const sign of [-1, 1])
        limb(
          [sign * 0.17, 1.35, 0.06],
          [sign * 0.17, 0.94, 0.08],
          0.018,
          0.018,
          mat('#47392b'),
        );
    }
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.53, 0.53, 0.045, 64),
      mat('#dde4dd'),
    );
    pedestal.position.y = -0.015;
    scene.add(pedestal);
    const size = () => {
      const w = el.clientWidth,
        h = el.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(size);
    observer.observe(el);
    size();
    let start = 0,
      drag = false;
    const down = (e: PointerEvent) => {
      drag = true;
      start = e.clientX;
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (drag) {
        figure.rotation.y += (e.clientX - start) * 0.012;
        start = e.clientX;
      }
    };
    const up = () => {
      drag = false;
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    let frame = 0;
    const tick = () => {
      renderer.render(scene, camera);
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const ms = Array.isArray(o.material) ? o.material : [o.material];
          ms.forEach((m) => m.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [p]);
  return (
    <div
      className="avatar-host"
      ref={host}
      role="img"
      aria-label="可拖动旋转的三维穿搭人物"
    >
      {error && (
        <p className="avatar-error">
          当前设备无法显示三维人物，请使用支持 WebGL 的浏览器。
        </p>
      )}
    </div>
  );
}
