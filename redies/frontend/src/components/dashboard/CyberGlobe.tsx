import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { AttackLog } from '@/lib/mockData';

function latLngToVec3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function Globe() {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((_, delta) => {
    ref.current.rotation.y += delta * 0.08;
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[2, 64, 64]} />
      <meshStandardMaterial
        color="#0a2a1a"
        emissive="#00e68a"
        emissiveIntensity={0.05}
        wireframe={false}
        transparent
        opacity={0.85}
      />
      {/* wireframe overlay */}
      <mesh>
        <sphereGeometry args={[2.01, 32, 32]} />
        <meshBasicMaterial color="#00e68a" wireframe transparent opacity={0.08} />
      </mesh>
    </mesh>
  );
}

function AttackPoints({ attacks }: { attacks: AttackLog[] }) {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((_, delta) => {
    groupRef.current.rotation.y += delta * 0.08;
  });

  const points = useMemo(() =>
    attacks.slice(0, 30).map(a => ({
      pos: latLngToVec3(a.lat, a.lng, 2.05),
      severity: a.severity,
      id: a.id,
    })),
    [attacks]
  );

  return (
    <group ref={groupRef}>
      {points.map(p => (
        <mesh key={p.id} position={p.pos}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshBasicMaterial
            color={p.severity === 'critical' ? '#ff3333' : p.severity === 'high' ? '#ffaa00' : '#ff6666'}
            transparent
            opacity={0.9}
          />
        </mesh>
      ))}
    </group>
  );
}

function AttackLines({ attacks }: { attacks: AttackLog[] }) {
  const groupRef = useRef<THREE.Group>(null!);
  const serverPos = latLngToVec3(37.7, -122.4, 2.05); // SF server location

  useFrame((state, delta) => {
    groupRef.current.rotation.y += delta * 0.08;
    groupRef.current.children.forEach((child, i) => {
      if ((child as THREE.Mesh).material) {
        const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
        mat.opacity = 0.2 + Math.sin(state.clock.elapsedTime * 3 + i) * 0.3;
      }
    });
  });

  const lines = useMemo(() =>
    attacks.slice(0, 15).map(a => {
      const start = latLngToVec3(a.lat, a.lng, 2.05);
      const mid = start.clone().add(serverPos).multiplyScalar(0.5).normalize().multiplyScalar(2.8);
      const curve = new THREE.QuadraticBezierCurve3(start, mid, serverPos);
      const tubeGeom = new THREE.TubeGeometry(curve, 20, 0.008, 4, false);
      return { geom: tubeGeom, id: a.id };
    }),
    [attacks]
  );

  return (
    <group ref={groupRef}>
      {lines.map(l => (
        <mesh key={l.id} geometry={l.geom}>
          <meshBasicMaterial color="#ff3333" transparent opacity={0.4} />
        </mesh>
      ))}
    </group>
  );
}

export default function CyberGlobe({ attacks }: { attacks: AttackLog[] }) {
  return (
    <div className="glass-panel p-2 h-[400px] relative overflow-hidden">
      <div className="absolute top-3 left-4 z-10">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Global Threat Map</h3>
        <p className="text-xs text-muted-foreground">{attacks.length} active threats</p>
      </div>
      <Canvas camera={{ position: [0, 0, 5.5], fov: 45 }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />
        <pointLight position={[-10, -10, -10]} intensity={0.3} color="#00e68a" />
        <Globe />
        <AttackPoints attacks={attacks} />
        <AttackLines attacks={attacks} />
        <OrbitControls enableZoom={false} enablePan={false} autoRotate={false} />
      </Canvas>
      {/* Server location indicator */}
      <div className="absolute bottom-3 right-4 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
        Server: San Francisco
      </div>
    </div>
  );
}
