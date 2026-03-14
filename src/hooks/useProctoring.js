/**
 * Proctoring: capture camera frames, send to Streaming AI for face detection,
 * show alert when backend returns a violation (no_face, multiple_faces, looking_left, etc.).
 * Runs when test/streaming has started (round test page is active).
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTestWs } from '../context/TestWsContext';

const CAPTURE_INTERVAL_MS = 3000;
const PROCTORING_MSG = {
  no_face: 'No face detected. Please ensure your face is visible to the camera.',
  multiple_faces: 'Multiple faces detected. Please ensure only you are in the frame.',
  looking_left: 'Please look at the screen.',
  looking_right: 'Please look at the screen.',
  looking_up: 'Please look at the screen.',
  looking_down: 'Please look at the screen.',
  head_turned: 'Please face the screen.',
};

export function useProctoring(enabled = true) {
  const { testWsRef } = useTestWs() || {};
  const [proctoringAlert, setProctoringAlert] = useState(null);
  const streamRef = useRef(null);
  const videoRef = useRef(null);
  const intervalRef = useRef(null);
  const listenerRef = useRef(null);

  const dismissProctoringAlert = useCallback(() => {
    setProctoringAlert(null);
  }, []);

  useEffect(() => {
    if (!enabled || !testWsRef?.current) return;

    const ws = testWsRef.current;
    if (ws.readyState !== 1) return;

    const handleMessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data?.type === 'proctoring_result' && data.event && data.event !== 'ok') {
          const message = PROCTORING_MSG[data.event] || `Proctoring: ${data.event}. Please follow test rules.`;
          setProctoringAlert({ event: data.event, message });
        }
      } catch (_) {}
    };

    ws.addEventListener('message', handleMessage);
    listenerRef.current = () => ws.removeEventListener('message', handleMessage);

    const captureAndSend = async () => {
      if (!videoRef.current || !streamRef.current || ws.readyState !== 1) return;
      const video = videoRef.current;
      if (video.videoWidth === 0 || video.videoHeight === 0) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0);
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
        if (!blob) return;
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        await new Promise((resolve, reject) => {
          reader.onload = resolve;
          reader.onerror = reject;
        });
        const base64 = (reader.result || '').split(',')[1];
        if (base64) {
          ws.send(JSON.stringify({ type: 'proctoring_frame', image_base64: base64 }));
        }
      } catch (err) {
        console.warn('[Proctoring] capture failed:', err);
      }
    };

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        const video = document.createElement('video');
        video.setAttribute('playsinline', '');
        video.setAttribute('muted', '');
        video.autoplay = true;
        video.muted = true;
        video.srcObject = stream;
        video.style.cssText = 'position:absolute;opacity:0;pointer-events:none;width:1px;height:1px;';
        document.body.appendChild(video);
        videoRef.current = video;
        await video.play();
        intervalRef.current = setInterval(captureAndSend, CAPTURE_INTERVAL_MS);
        setTimeout(captureAndSend, 1500);
      } catch (err) {
        console.warn('[Proctoring] camera access failed:', err);
      }
    };

    startCamera();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (videoRef.current && videoRef.current.parentNode) {
        videoRef.current.srcObject = null;
        videoRef.current.parentNode.removeChild(videoRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      videoRef.current = null;
      if (listenerRef.current) listenerRef.current();
    };
  }, [enabled, testWsRef]);

  return { proctoringAlert, dismissProctoringAlert };
}
