import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { Layout } from '../lib/packing';

interface Props {
  layout: Layout;
  perBoxCount: number;
  totalBoxes: number;
}

const BATCH = 10; // 每批飞入件数
const BATCH_INTERVAL = 0.12; // 批间隔（秒）
const FLIGHT = 0.5; // 单件飞行时长（秒）

/** 零件按 positions 逐个（分批）从箱上方飞入 */
function AnimatedItems({ layout }: { layout: Layout }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const start = useRef<number | null>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = layout.positions.length;

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    if (start.current === null) start.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - start.current;
    for (let i = 0; i < count; i++) {
      const delay = Math.floor(i / BATCH) * BATCH_INTERVAL;
      const a = Math.min(1, Math.max(0, (t - delay) / FLIGHT));
      const e = 1 - Math.pow(1 - a, 3); // easeOutCubic
      const [x, y, z] = layout.positions[i];
      dummy.position.set(x, y + (1 - e) * (layout.boxSize[1] + 250), z);
      dummy.scale.setScalar(0.3 + 0.7 * e);
      dummy.rotation.set(0, (1 - e) * Math.PI * 0.5, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, count]}
    >
      <boxGeometry args={layout.itemSize} />
      <meshStandardMaterial color="#3b82f6" roughness={0.45} metalness={0.1} />
    </instancedMesh>
  );
}

/** 箱体：半透明 + 线框，底面 y=0 */
function Crate({ layout }: { layout: Layout }) {
  const [w, h, d] = layout.boxSize;
  return (
    <group position={[0, h / 2, 0]}>
      <mesh>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#94a3b8" transparent opacity={0.15} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(w, h, d)]} />
        <lineBasicMaterial color="#475569" />
      </lineSegments>
    </group>
  );
}

export default function PackingScene({ layout, perBoxCount, totalBoxes }: Props) {
  const [replay, setReplay] = useState(0);
  const [w, h, d] = layout.boxSize;

  return (
    <div className="scene-wrap">
      <div className="scene-badge">
        共需 <strong>{totalBoxes}</strong> 箱 · 每箱 <strong>{perBoxCount}</strong> 件
      </div>
      <button className="scene-replay" onClick={() => setReplay((r) => r + 1)}>
        ↻ 重播
      </button>
      <Canvas
        camera={{ position: [w * 1.1, h * 1.6, d * 1.4], fov: 45 }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#eef2f8']} />
        <ambientLight intensity={0.65} />
        <directionalLight position={[w * 1.2, h * 2.4, d * 1.1]} intensity={0.95} />
        <directionalLight position={[-w, h * 1.2, -d]} intensity={0.35} />
        <Crate layout={layout} />
        <AnimatedItems key={replay} layout={layout} />
        <OrbitControls
          makeDefault
          target={[0, h / 2, 0]}
          minDistance={w * 0.5}
          maxDistance={w * 5}
        />
        <gridHelper args={[Math.max(w, d) * 3, 12, '#cbd5e1', '#e2e8f0']} position={[0, -0.5, 0]} />
      </Canvas>
    </div>
  );
}
