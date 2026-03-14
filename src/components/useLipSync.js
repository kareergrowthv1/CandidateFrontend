import { useRef, useEffect } from 'react';
import { LIP_SYNC_MORPHS, BLINK_MORPHS } from '../utils/visemeMap';

const VOLUME_THRESHOLD = 0.018;
const LERP_SPEED_OPEN = 6;
const LERP_SPEED_CLOSE = 4;
const BLINK_INTERVAL_MIN = 2800;
const BLINK_INTERVAL_MAX = 5200;
const BLINK_DURATION = 0.22;
const IDLE_HEAD_AMP = 0.018;
const IDLE_HEAD_FREQ = 0.22;
const BREATH_AMP = 0.006;
const BREATH_FREQ = 0.2;

function lerp(a, b, t) {
  return a + (b - a) * Math.min(1, t);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function useLipSync(meshRef, analyserRef, morphTargetMapRef) {
  const jawOpenRef = useRef(0);
  const blinkRef = useRef(0);
  const blinkTimeRef = useRef(0);
  const nextBlinkRef = useRef(BLINK_INTERVAL_MIN / 1000 + Math.random() * ((BLINK_INTERVAL_MAX - BLINK_INTERVAL_MIN) / 1000));
  const idleTimeRef = useRef(0);
  const dataArrayRef = useRef(null);

  useEffect(() => {
    let raf = 0;
    let lastTime = 0;

    const tick = (now) => {
      const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.1) : 1 / 60;
      lastTime = now;

      const mesh = meshRef.current;
      const morphMap = morphTargetMapRef?.current;
      if (!mesh || !morphMap) {
        raf = requestAnimationFrame(tick);
        return;
      }

      idleTimeRef.current += dt;
      blinkTimeRef.current += dt;

      const analyser = analyserRef?.current;
      if (analyser) {
        const bufferLength = analyser.frequencyBinCount;
        if (!dataArrayRef.current) dataArrayRef.current = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArrayRef.current);
        let sum = 0;
        for (let i = 0; i < dataArrayRef.current.length; i++) sum += dataArrayRef.current[i];
        const avg = sum / dataArrayRef.current.length / 255;
        const targetJaw = avg > VOLUME_THRESHOLD ? clamp(avg * 2.2, 0, 0.85) : 0;
        jawOpenRef.current = lerp(jawOpenRef.current, targetJaw, dt * (targetJaw > jawOpenRef.current ? LERP_SPEED_OPEN : LERP_SPEED_CLOSE));
      } else {
        jawOpenRef.current = lerp(jawOpenRef.current, 0, dt * LERP_SPEED_CLOSE);
      }

      if (morphMap.jawOpen !== undefined) mesh.morphTargetInfluences[morphMap.jawOpen] = jawOpenRef.current;
      if (morphMap.mouthClose !== undefined) mesh.morphTargetInfluences[morphMap.mouthClose] = clamp(1 - jawOpenRef.current * 0.5, 0, 1);

      blinkTimeRef.current += dt;
      if (blinkTimeRef.current >= nextBlinkRef.current) {
        nextBlinkRef.current = BLINK_INTERVAL_MIN / 1000 + Math.random() * ((BLINK_INTERVAL_MAX - BLINK_INTERVAL_MIN) / 1000);
        blinkTimeRef.current = 0;
      }
      const blinkPhase = blinkTimeRef.current < BLINK_DURATION
        ? Math.sin((blinkTimeRef.current / BLINK_DURATION) * Math.PI)
        : 0;
      blinkRef.current = lerp(blinkRef.current, blinkPhase, dt * 14);
      if (morphMap.eyeBlinkLeft !== undefined) mesh.morphTargetInfluences[morphMap.eyeBlinkLeft] = blinkRef.current;
      if (morphMap.eyeBlinkRight !== undefined) mesh.morphTargetInfluences[morphMap.eyeBlinkRight] = blinkRef.current;

      const headRotY = Math.sin(idleTimeRef.current * IDLE_HEAD_FREQ) * IDLE_HEAD_AMP;
      const headRotX = Math.sin(idleTimeRef.current * BREATH_FREQ) * BREATH_AMP;
      let target = mesh;
      while (target.parent && target.parent.type !== 'Scene') target = target.parent;
      if (target.rotation) {
        target.rotation.y = headRotY;
        target.rotation.x = headRotX;
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [meshRef, analyserRef, morphTargetMapRef]);
}
