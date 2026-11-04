// Audio conversion and playback utilities for 16kHz input / 24kHz output PCM

/**
 * Converts Float32Array audio data (from Web Audio API) into 16-bit PCM little-endian Base64
 */
export function float32ToPcm16Base64(input: Float32Array): string {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < input.length; i++) {
    // Clamp sample between -1.0 and 1.0
    const s = Math.max(-1, Math.min(1, input[i]));
    // Scale to 16-bit signed integer (-32768 to 32767)
    const val = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(i * 2, val, true); // true = little endian
  }

  // Convert binary buffer to Base64 string
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts a Base64 string containing 16-bit PCM little-endian into a Float32Array
 */
export function base64Pcm16ToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const int16View = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16View.length);
  for (let i = 0; i < int16View.length; i++) {
    float32[i] = int16View[i] / 32768.0;
  }
  return float32;
}

/**
 * Audio Player queue for gapless 24kHz PCM playback with instant interruption
 */
export class LiveAudioPlayer {
  private audioCtx: AudioContext | null = null;
  private nextStartTime: number = 0;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private onVolumeChange?: (vol: number) => void;
  private volumeInterval: any = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;

  constructor(onVolumeChange?: (vol: number) => void) {
    this.onVolumeChange = onVolumeChange;
  }

  private initContext(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === "closed") {
      const AudioCtxClass =
        window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass({ sampleRate: 24000 });
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 64;
      this.dataArray = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
      this.analyser.connect(this.audioCtx.destination);

      // Start volume monitor
      if (this.onVolumeChange) {
        this.volumeInterval = setInterval(() => {
          if (this.analyser && this.dataArray && this.activeSources.size > 0) {
            this.analyser.getByteFrequencyData(this.dataArray as any);
            let sum = 0;
            for (let i = 0; i < this.dataArray.length; i++) {
              sum += this.dataArray[i];
            }
            const avg = sum / this.dataArray.length;
            this.onVolumeChange?.(Math.min(1, avg / 120));
          } else {
            this.onVolumeChange?.(0);
          }
        }, 50);
      }
    }

    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Schedule incoming 24kHz PCM chunk for gapless playback
   */
  public enqueuePcmChunk(base64Audio: string) {
    try {
      const ctx = this.initContext();
      const float32 = base64Pcm16ToFloat32(base64Audio);
      if (float32.length === 0) return;

      const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      if (this.analyser) {
        source.connect(this.analyser);
      } else {
        source.connect(ctx.destination);
      }

      // Schedule gapless playback
      const currentTime = ctx.currentTime;
      const startTime = Math.max(currentTime, this.nextStartTime);
      source.start(startTime);
      this.nextStartTime = startTime + audioBuffer.duration;

      this.activeSources.add(source);
      source.onended = () => {
        this.activeSources.delete(source);
      };
    } catch (err) {
      console.error("[LiveAudioPlayer error]:", err);
    }
  }

  /**
   * Instantly stops playback and empties audio buffer on interruption
   */
  public interrupt() {
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch (_) {}
    }
    this.activeSources.clear();
    if (this.audioCtx) {
      this.nextStartTime = this.audioCtx.currentTime;
    }
    this.onVolumeChange?.(0);
  }

  public close() {
    this.interrupt();
    if (this.volumeInterval) {
      clearInterval(this.volumeInterval);
      this.volumeInterval = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}
