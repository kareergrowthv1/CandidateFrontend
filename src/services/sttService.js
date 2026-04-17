/**
 * Speech-to-Text Service (WebSocket Edition)
 * Streams PCM audio to the Streaming AI backend (Port 9000) for AssemblyAI transcription.
 */

class STTService {
  constructor() {
    this.ws = null;
    this.audioContext = null;
    this.scriptProcessor = null;
    this.stream = null;
    this.isListening = false;
    this.transcript = '';
    this.callbacks = {};
    this.sessionInfo = null;
    this.isSupported = !!(window.AudioContext || window.webkitAudioContext);
  }

  async initialize(sessionInfo) {
    this.sessionInfo = sessionInfo;
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return true;
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.warn('STT: Connection timeout, falling back...');
        resolve(false);
      }, 5000);

      // Use the proxy on 4003 which targets 9000 Streaming AI
      const wsPath = '/ws/test';
      const wsUrl = `${import.meta.env.VITE_AI_WS_URL}`.replace(/^http/, 'ws') + wsPath;
      
      console.log('STT: Connecting to', wsUrl);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        clearTimeout(timeout);
        console.log('STT: WebSocket connected');
        // Initial handshake required for Streaming AI
        this.ws.send(JSON.stringify({
          type: 'init',
          client_id: sessionInfo.clientId,
          position_id: sessionInfo.positionId,
          candidate_id: sessionInfo.candidateId,
          question_set_id: sessionInfo.questionSetId || "",
          tenant_id: localStorage.getItem('tenantId') || "",
          is_conversational: sessionInfo.isConversational
        }));
        resolve(true);
      };

      this.ws.onmessage = (event) => {
        if (typeof event.data !== 'string') return;
        
        try {
          const msg = JSON.parse(event.data);
          
          if (msg.type === 'transcript') {
            if (msg.error) {
              console.error('STT: Backend transcript error:', msg.error);
              if (this.callbacks.onError) this.callbacks.onError(msg.error);
              return;
            }
            
            if (msg.is_final) {
              this.transcript += msg.text + ' ';
            }
            
            if (this.callbacks.onResult) {
              this.callbacks.onResult({
                final: this.transcript,
                interim: msg.is_final ? '' : msg.text,
                full: this.transcript + (msg.is_final ? '' : msg.text)
              });
            }
          } else if (msg.type === 'listening_started') {
            this.isListening = true;
            if (this.callbacks.onStart) this.callbacks.onStart();
          } else if (msg.type === 'listening_stopped') {
            this.isListening = false;
            if (this.callbacks.onEnd) this.callbacks.onEnd();
          }
        } catch (e) {
          console.warn('STT: Message parse error:', e);
        }
      };

      this.ws.onerror = (err) => {
        clearTimeout(timeout);
        console.error('STT: WebSocket error:', err);
        resolve(false);
      };

      this.ws.onclose = () => {
        clearTimeout(timeout);
        console.log('STT: WebSocket closed');
        this.isListening = false;
      };
    });
  }

  async speak(text, voice) {
    // TTS is now handled by speechUtils using window.speechSynthesis to match CandidateTest
    console.warn('STT: speak() called but TTS is now handled via browser synthesis');
    return Promise.resolve();
  }

  async startListening(callbacks = {}) {
    this.callbacks = { ...this.callbacks, ...callbacks };
    this.transcript = '';

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      const success = await this.initialize(this.sessionInfo);
      if (!success) return false;
    }

    // Tell backend to start AssemblyAI session
    this.ws.send(JSON.stringify({ type: 'start_listening' }));

    // Start Audio Capture (PCM 16kHz Mono)
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      const source = this.audioContext.createMediaStreamSource(this.stream);
      
      this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.scriptProcessor.onaudioprocess = (e) => {
        if (!this.isListening || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
        }

        // Send as base64 audio_chunk for Streaming AI
        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
        this.ws.send(JSON.stringify({
          type: 'audio_chunk',
          data: base64Audio
        }));
      };

      source.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);

      return true;
    } catch (err) {
      console.error('STT: Audio capture failed:', err);
      this.isListening = false;
      return false;
    }
  }

  stopListening() {
    this.isListening = false;
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'stop_listening' }));
      this.ws.close();
      this.ws = null;
    }

    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
  }

  getTranscript() {
    return this.transcript;
  }

  clearTranscript() {
    this.transcript = '';
  }

  isActive() {
    return this.isListening;
  }
}

export const sttService = new STTService();
