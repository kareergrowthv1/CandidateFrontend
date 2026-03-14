import { useRef, useEffect, useCallback } from 'react';

const FFT_SIZE = 512;
const TTS_MESSAGE_TYPES = ['tts_audio', 'tts_chunk', 'audio'];

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export function useAudioStream(wsRef) {
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);

  const ensureContext = useCallback(() => {
    if (audioContextRef.current) return audioContextRef.current;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioContextRef.current = ctx;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = 0.8;
    analyserRef.current = analyser;
    return ctx;
  }, []);

  const playAudio = useCallback(
    async (base64) => {
      try {
        const ctx = ensureContext();
        if (ctx.state === 'suspended') await ctx.resume();
        const arrayBuffer = base64ToArrayBuffer(base64);
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        if (sourceRef.current) {
          try {
            sourceRef.current.stop();
          } catch (_) {}
        }
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(analyserRef.current);
        analyserRef.current.connect(ctx.destination);
        source.start(0);
        sourceRef.current = source;
        source.onended = () => {
          sourceRef.current = null;
        };
      } catch (_) {}
    },
    [ensureContext]
  );

  useEffect(() => {
    const ws = wsRef?.current;
    if (!ws || ws.readyState !== 1) return;

    const onMessage = (event) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : null;
        if (!data || !TTS_MESSAGE_TYPES.includes(data.type)) return;
        const raw = data.data ?? data.audio ?? data.base64;
        if (raw) playAudio(raw);
      } catch (_) {}
    };

    ws.addEventListener('message', onMessage);
    return () => ws.removeEventListener('message', onMessage);
  }, [wsRef, playAudio]);

  useEffect(() => {
    ensureContext();
    return () => {
      if (sourceRef.current) {
        try {
          sourceRef.current.stop();
        } catch (_) {}
        sourceRef.current = null;
      }
      if (analyserRef.current && audioContextRef.current) {
        try {
          analyserRef.current.disconnect();
        } catch (_) {}
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      analyserRef.current = null;
    };
  }, [ensureContext]);

  return { analyserRef, audioContextRef };
}
