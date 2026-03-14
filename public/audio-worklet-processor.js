/**
 * AudioWorklet processor: Float32 mono → PCM16, postMessage to main thread.
 * Replaces deprecated ScriptProcessorNode for STT mic capture.
 */
class PCMSenderProcessor extends AudioWorkletProcessor {
  process(inputs, _outputs, _parameters) {
    const input = inputs[0]?.[0];
    if (!input || input.length === 0) return true;
    const int16 = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    this.port.postMessage({ audio: int16.buffer }, [int16.buffer]);
    return true;
  }
}
registerProcessor('pcm-sender', PCMSenderProcessor);
