import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { useTestWs } from '../context/TestWsContext';
import { useAudioStream } from './useAudioStream';
import { useLipSync } from './useLipSync';
import { LIP_SYNC_MORPHS, BLINK_MORPHS, MORPH_ALIASES } from '../utils/visemeMap';

const DEFAULT_AVATAR_URL = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/models/gltf/RobotExpressive/RobotExpressive.glb';
const AVATAR_GLB_URL = import.meta.env.VITE_AVATAR_GLB_URL || DEFAULT_AVATAR_URL;

if (typeof useGLTF.preload === 'function') {
  useGLTF.preload(AVATAR_GLB_URL);
}

function buildMorphMap(mesh) {
  if (!mesh?.morphTargetDictionary) return {};
  const dict = mesh.morphTargetDictionary;
  const names = [...LIP_SYNC_MORPHS, ...BLINK_MORPHS];
  const map = {};
  names.forEach((name) => {
    if (dict[name] !== undefined) {
      map[name] = dict[name];
      return;
    }
    const aliases = MORPH_ALIASES[name];
    if (aliases) {
      for (const alt of aliases) {
        if (dict[alt] !== undefined) {
          map[name] = dict[alt];
          return;
        }
      }
    }
  });
  return map;
}

function AvatarModel({ url, meshRef, morphTargetMapRef }) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => {
    const clone = scene.clone();
    clone.traverse((node) => {
      if (!node.isMesh) return;
      if (node.morphTargetInfluences && node.morphTargetInfluences.length > 0) {
        meshRef.current = node;
        morphTargetMapRef.current = buildMorphMap(node);
      } else if (!meshRef.current) {
        meshRef.current = node;
        morphTargetMapRef.current = {};
      }
    });
    return clone;
  }, [scene, meshRef, morphTargetMapRef]);

  return <primitive object={cloned} />;
}

function Scene({ meshRef, morphTargetMapRef, analyserRef }) {
  useLipSync(meshRef, analyserRef, morphTargetMapRef);

  return (
    <>
      <ambientLight intensity={1} />
      <directionalLight position={[2, 3, 4]} intensity={1} />
      <directionalLight position={[-2, 2, 3]} intensity={0.5} />
      <pointLight position={[0, 2, 2]} intensity={0.4} distance={8} />
      <group position={[0, -1.35, 0]} scale={1.35} rotation={[0, 0, 0]}>
        <AvatarModel url={AVATAR_GLB_URL} meshRef={meshRef} morphTargetMapRef={morphTargetMapRef} />
      </group>
    </>
  );
}

export default function Avatar() {
  const { testWsRef } = useTestWs() || {};
  const meshRef = useRef(null);
  const morphTargetMapRef = useRef({});
  const { analyserRef } = useAudioStream(testWsRef);

  return (
    <div className="human-agent-container" style={{ width: '100%', height: '100%', minHeight: 320, background: 'transparent' }}>
      <Canvas
        camera={{ position: [0, 0.35, 2.4], fov: 42 }}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
        style={{ background: 'transparent' }}
      >
        <color attach="background" args={['transparent']} />
        <Suspense fallback={null}>
          <Scene meshRef={meshRef} morphTargetMapRef={morphTargetMapRef} analyserRef={analyserRef} />
        </Suspense>
      </Canvas>
    </div>
  );
}
