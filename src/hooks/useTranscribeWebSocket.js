/**
 * Live STT via WebSocket → AiService → AssemblyAI.
 * Captures mic as PCM16 mono via AudioWorklet, streams to /ws/transcribe.
 * WS URL from config/env (via .env / .env.local)
 */
import { useState, useRef, useCallback } from 'react';
import { AI_WS_URL } from '../constants/api';

const WS_BASE = AI_WS_URL.replace(/^http/, 'ws');
const WS_PATH = '/ws/transcribe';
const WORKLET_URL = '/audio-worklet-processor.js';
/** ~100ms at 48kHz mono PCM16: 4800 samples = 9600 bytes */
const SEND_CHUNK_BYTES = 9600;

/** Normalize for duplicate/extension checks: lowercase, strip punctuation, collapse spaces */
function norm(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function useTranscribeWebSocket() {
  const [transcript, setTranscript] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const fullTextRef = useRef('');
  const lastFinalRef = useRef('');
  const lastAddedRef = useRef('');
  const wsRef = useRef(null);
  const streamRef = useRef(null);
  const ctxRef = useRef(null);
  const workletNodeRef = useRef(null);
  const sourceRef = useRef(null);

  const stop = useCallback(() => {
    try {
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
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ stop: true }));
        wsRef.current.close();
      }
      wsRef.current = null;
      setIsConnected(false);
    } catch (e) {
      console.warn('useTranscribeWebSocket stop error:', e);
    }
  }, []);

  const start = useCallback(() => {
    setError(null);
    setTranscript('');
    fullTextRef.current = '';
    lastFinalRef.current = '';
    lastAddedRef.current = '';
    const ws = new WebSocket(WS_BASE + WS_PATH);
    wsRef.current = ws;

    ws.onopen = async () => {
      setIsConnected(true);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
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
          if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
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
            wsRef.current.send(out.buffer);
          }
        };

        source.connect(workletNode);
        workletNode.connect(gain);
        gain.connect(ctx.destination);
      } catch (e) {
        setError(e?.message || 'Microphone access failed');
        stop();
      }
    };

    ws.onmessage = (event) => {
      if (typeof event.data !== 'string') return;
      try {
        const msg = JSON.parse(event.data);
        const t = (msg.text || '').trim();
        const typ = msg.type || '';
        if (typ === 'partial' || typ === 'final') {
            if (typ === 'final' && t) {
            const prev = fullTextRef.current;
            const last = lastFinalRef.current;
            const lastAdded = lastAddedRef.current;
            const n = norm(t);
            const nLast = norm(last);
            if (!n) {
              /* empty after normalize: skip */
            } else if (n === nLast) {
              /* duplicate (exact or case/punct variant): skip */
            } else if (nLast && nLast.startsWith(n) && nLast.length > n.length) {
              /* shortened / older: skip */
            } else if (nLast && n.startsWith(nLast) && n.length > nLast.length) {
              /* extension: replace last segment */
              const without = prev.slice(0, prev.length - lastAdded.length);
              const sep = without.length ? ' ' : '';
              const added = sep + t;
              fullTextRef.current = without + added;
              lastFinalRef.current = t;
              lastAddedRef.current = added;
            } else {
              /* new segment */
              const sep = prev.length ? ' ' : '';
              const added = sep + t;
              fullTextRef.current = prev + added;
              lastFinalRef.current = t;
              lastAddedRef.current = added;
            }
          }
          setTranscript(() => {
            if (typ === 'final') return fullTextRef.current;
            if (t && norm(t) === norm(lastFinalRef.current)) return fullTextRef.current;
            return fullTextRef.current + (t ? ' ' + t : '');
          });
        } else if (typ === 'done' && msg.full_text != null) {
          fullTextRef.current = msg.full_text;
          lastFinalRef.current = '';
          lastAddedRef.current = '';
          setTranscript(msg.full_text);
        } else if (typ === 'error') {
          setError(msg.text || 'Transcription error');
        }
      } catch (_) {}
    };

    ws.onerror = () => setError('WebSocket error');
    ws.onclose = () => {
      setIsConnected(false);
      stop();
    };
  }, [stop]);

  const getFullText = useCallback(() => fullTextRef.current || transcript, [transcript]);

  return { transcript, isConnected, error, start, stop, getFullText };
}
