import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { MixedLayout } from '../lib/packing-mixed';

interface Props {
  layout: MixedLayout;
  totalBoxes: number;
  skuCount: number;
  skuNames: string[];
}

/** SKU 配色：accent 紫系邻近色 */
const SKU_COLORS = ['#7351a6', '#538471', '#b0855a', '#4a7ab5', '#a65a7e'];

const BATCH = 10;
const BATCH_INTERVAL = 0.12;
const FLIGHT = 0.5;

interface AnimItem {
  pos: [number, number, number];
  size: [number, number, number];
  delayIndex: number;
}

/** 单 SKU 颜色组：instancedMesh 分批飞入 */
function ColorGroup({ color, items }: { color: string; items: AnimItem[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const start = useRef<number | null>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const size = items[0]?.size ?? [1, 1, 1];

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    if (start.current === null) start.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - start.current;
    for (let i = 0; i < items.length; i++) {
      const { pos, delayIndex } = items[i];
      const delay = Math.floor(delayIndex / BATCH) * BATCH_INTERVAL;
      const a = Math.min(1, Math.max(0, (t - delay) / FLIGHT));
      const e = 1 - Math.pow(1 - a, 3);
      dummy.position.set(pos[0], pos[1] + (1 - e) * 250, pos[2]);
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
      args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, items.length]}
    >
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.45} metalness={0.1} />
    </instancedMesh>
  );
}

function AnimatedItems({ layout }: { layout: MixedLayout }) {
  const groups = useMemo(() => {
    const byColor = new Map<number, AnimItem[]>();
    layout.items.forEach((it, idx) => {
      const arr = byColor.get(it.colorIndex) ?? [];
      arr.push({ pos: it.position, size: it.size, delayIndex: idx });
      byColor.set(it.colorIndex, arr);
    });
    return [...byColor.entries()].sort((a, b) => a[0] - b[0]);
  }, [layout]);

  return (
    <>
      {groups.map(([colorIndex, items]) => (
        <ColorGroup key={colorIndex} color={SKU_COLORS[colorIndex % SKU_COLORS.length]} items={items} />
      ))}
    </>
  );
}

function Crate({ layout }: { layout: MixedLayout }) {
  const [w, h, d] = layout.boxSize;
  return (
    <group position={[0, h / 2, 0]}>
      <mesh>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#b9a8d4" transparent opacity={0.14} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(w, h, d)]} />
        <lineBasicMaterial color="#7351a6" />
      </lineSegments>
    </group>
  );
}

export default function PackingScene({ layout, totalBoxes, skuCount, skuNames }: Props) {
  const [replay, setReplay] = useState(0);
  const [w, h, d] = layout.boxSize;

  return (
    <div className="scene-canvas">
      <div className="scene-badge">
        共需 <strong>{totalBoxes}</strong> 箱 · 混装 <strong>{skuCount}</strong> 种 · 本箱{' '}
        <strong>{layout.items.length}</strong> 件
      </div>
      <button className="scene-replay" onClick={() => setReplay((r) => r + 1)}>
        ↻ 重播
      </button>
      <div className="scene-legend">
        {skuNames.map((name, i) => (
          <span key={i} className="legend-chip">
            <i style={{ background: SKU_COLORS[i % SKU_COLORS.length] }} />
            {name}
          </span>
        ))}
      </div>
      <Canvas camera={{ position: [w * 1.1, h * 1.6, d * 1.4], fov: 45 }} dpr={[1, 2]}>
        <color attach="background" args={['#eef2f8']} />
        <ambientLight intensity={0.65} />
        <directionalLight position={[w * 1.2, h * 2.4, d * 1.1]} intensity={0.95} />
        <directionalLight position={[-w, h * 1.2, -d]} intensity={0.35} />
        <Crate layout={layout} />
        <AnimatedItems key={replay} layout={layout} />
        <OrbitControls makeDefault target={[0, h / 2, 0]} minDistance={w * 0.5} maxDistance={w * 5} />
        <gridHelper args={[Math.max(w, d) * 3, 12, '#cbd5e1', '#e2e8f0']} position={[0, -0.5, 0]} />
      </Canvas>
    </div>
  );
}
