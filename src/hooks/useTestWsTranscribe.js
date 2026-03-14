/**
 * Live STT over the same test WebSocket (/ws/test).
 * Sends start_listening, audio_chunk (base64), stop_listening; transcript comes from TestWsContext.
 */
import { useCallback, useRef, useState } from 'react';
import { useTestWs } from '../context/TestWsContext';

const WORKLET_URL = '/audio-worklet-processor.js';
/** ~100ms at 16kHz mono PCM16 for AssemblyAI: 3200 bytes. Use similar chunk for batching. */
const SEND_CHUNK_BYTES = 6400;

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function useTestWsTranscribe() {
  const { testWsRef, transcript, getFullText, clearTranscript } = useTestWs();
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const streamRef = useRef(null);
  const ctxRef = useRef(null);
  const workletNodeRef = useRef(null);
  const sourceRef = useRef(null);

  const stop = useCallback(() => {
    try {
      const ws = testWsRef?.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'stop_listening' }));
      }
      if (workletNodeRef.current && sourceRef.current) {
        try {
          sourceRef.current.disconnect();
          workletNodeRef.current.disconnect();
        } catch (_) {}
        workletNodeRef.current = null;
        sourceRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (ctxRef.current && ctxRef.current.state !== 'closed') {
        ctxRef.current.close();
        ctxRef.current = null;
      }
      setIsConnected(false);
    } catch (e) {
      console.warn('useTestWsTranscribe stop error:', e);
    }
  }, [testWsRef]);

  const start = useCallback(() => {
    setError(null);
    clearTranscript?.();
    const ws = testWsRef?.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setError('Test WebSocket not open');
      return;
    }
    ws.send(JSON.stringify({ type: 'start_listening' }));
    setIsConnected(true);
    // Wait for backend to connect to AssemblyAI before sending audio (avoids "Unknown type" and ensures STT is ready)
    const onMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.type === 'listening_started') {
          ws.removeEventListener('message', onMessage);
          clearTimeout(timeout);
          startCapture();
        } else if (data?.type === 'transcript' && data?.error) {
          ws.removeEventListener('message', onMessage);
          setError(data.error || 'STT failed');
          stop();
        }
      } catch (_) {}
    };
    ws.addEventListener('message', onMessage);
    const timeout = setTimeout(() => {
      ws.removeEventListener('message', onMessage);
      startCapture();
    }, 3000);

    async function startCapture() {
      clearTimeout(timeout);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        ctxRef.current = ctx;
        await ctx.audioWorklet.addModule(WORKLET_URL);
        const source = ctx.createMediaStreamSource(stream);
        sourceRef.current = source;
        const workletNode = new AudioWorkletNode(ctx, 'pcm-sender');
        workletNodeRef.current = workletNode;
        const gain = ctx.createGain();
        gain.gain.value = 0;

        const buffer = [];
        let bufferBytes = 0;
        workletNode.port.onmessage = (e) => {
          const w = testWsRef?.current;
          if (!w || w.readyState !== WebSocket.OPEN) return;
          const buf = e.data?.audio;
          if (!buf) return;
          buffer.push(new Uint8Array(buf));
          bufferBytes += buf.byteLength;
          if (bufferBytes >= SEND_CHUNK_BYTES) {
            const out = new Uint8Array(bufferBytes);
            let off = 0;
            for (const chunk of buffer) {
              out.set(chunk, off);
              off += chunk.length;
            }
            buffer.length = 0;
            bufferBytes = 0;
            const b64 = arrayBufferToBase64(out.buffer);
            w.send(JSON.stringify({ type: 'audio_chunk', data: b64 }));
          }
        };

        source.connect(workletNode);
        workletNode.connect(gain);
        gain.connect(ctx.destination);
        console.log('[STT] Microphone capture started, sending audio to backend (16kHz PCM)');
      } catch (e) {
        setError(e?.message || 'Microphone access failed');
        stop();
      }
    }
  }, [testWsRef, clearTranscript, stop]);

  return { transcript, isConnected, error, start, stop, getFullText };
}
