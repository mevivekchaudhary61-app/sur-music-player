/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Web Audio API & MediaSession Powered Dual-Core Audio Engine for Sur
export interface EqualizerPreset {
  name: string;
  gains: number[]; // 5 values for [60Hz, 230Hz, 910Hz, 4kHz, 14kHz]
}

export const EQUALIZER_PRESETS: EqualizerPreset[] = [
  { name: 'Flat', gains: [0, 0, 0, 0, 0] },
  { name: 'Bass Boost', gains: [6, 4, 0, 0, -2] },
  { name: 'Vocal', gains: [-3, -1, 4, 5, 2] },
  { name: 'Electronic', gains: [5, 3, -1, 3, 4] },
  { name: 'Acoustic', gains: [3, 1, 2, 3, 1] },
  { name: 'Treble Boost', gains: [-2, -1, 1, 4, 6] },
];

class AudioEngine {
  private audioLocal: HTMLAudioElement;
  private audioExternal: HTMLAudioElement;
  private activeCore: 'local' | 'external' = 'external';
  private activePlayPromise: Promise<void> | null = null;

  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private filters: BiquadFilterNode[] = [];
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  
  private frequencies = [60, 230, 910, 4000, 14000];
  private currentPresetGains: number[] = [0, 0, 0, 0, 0];
  private isInitialized = false;

  constructor() {
    this.audioLocal = new Audio();
    this.audioLocal.crossOrigin = 'anonymous'; // Allowed for Blob URLs

    this.audioExternal = new Audio();
    // Bypasses CORS completely for external SoundHelix streams
  }

  // Get active HTMLAudioElement
  public get audio(): HTMLAudioElement {
    return this.activeCore === 'local' ? this.audioLocal : this.audioExternal;
  }

  // Initialize Web Audio context strictly for local files to support EQ and Visualizer
  public initContext() {
    if (this.isInitialized) return;
    
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      this.audioCtx = new AudioContextClass();
      this.sourceNode = this.audioCtx.createMediaElementSource(this.audioLocal);
      
      this.filters = this.frequencies.map((freq, index) => {
        const filter = this.audioCtx!.createBiquadFilter();
        if (index === 0) {
          filter.type = 'lowshelf';
        } else if (index === this.frequencies.length - 1) {
          filter.type = 'highshelf';
        } else {
          filter.type = 'peaking';
          filter.Q.value = 1.0;
        }
        filter.frequency.value = freq;
        filter.gain.value = this.currentPresetGains[index];
        return filter;
      });

      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 128;

      this.gainNode = this.audioCtx.createGain();

      let lastNode: AudioNode = this.sourceNode;
      this.filters.forEach((filter) => {
        lastNode.connect(filter);
        lastNode = filter;
      });
      
      lastNode.connect(this.analyser);
      this.analyser.connect(this.gainNode);
      this.gainNode.connect(this.audioCtx.destination);

      this.isInitialized = true;
    } catch (error) {
      console.warn('Web Audio API Equalizer initialization failed.', error);
    }
  }

  public setSong(url: string) {
    // Forcefully stop both audio cores to prevent simultaneous playback
    this.audioLocal.pause();
    this.audioLocal.currentTime = 0;
    this.audioExternal.pause();
    this.audioExternal.currentTime = 0;

    if (url.startsWith('blob:')) {
      this.activeCore = 'local';
      // Reset external core completely
      this.audioExternal.removeAttribute('src');
      this.audioExternal.load();

      this.audioLocal.src = url;
      this.audioLocal.load();
    } else {
      this.activeCore = 'external';
      // Reset local core completely
      this.audioLocal.removeAttribute('src');
      this.audioLocal.load();

      this.audioExternal.src = url;
      this.audioExternal.load();
    }
  }

  public async play(): Promise<void> {
    const targetAudio = this.activeCore === 'local' ? this.audioLocal : this.audioExternal;
    const inactiveAudio = this.activeCore === 'local' ? this.audioExternal : this.audioLocal;

    // Ensure opposite audio is stopped
    inactiveAudio.pause();

    if (this.activeCore === 'local') {
      this.initContext();
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        try {
          await this.audioCtx.resume();
        } catch (_) {}
      }
    }

    try {
      const p = targetAudio.play();
      this.activePlayPromise = p;
      await p;
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.includes('pause') || err?.message?.includes('interrupted')) {
        // Normal user interruption when pause is pressed rapidly
        return;
      }
      throw err;
    } finally {
      this.activePlayPromise = null;
    }
  }

  public pause() {
    this.audioLocal.pause();
    this.audioExternal.pause();
    this.activePlayPromise = null;
  }

  public stop() {
    this.pause();
    try {
      this.audioLocal.currentTime = 0;
      this.audioExternal.currentTime = 0;
    } catch (_) {}
  }

  public seek(seconds: number) {
    this.audio.currentTime = seconds;
  }

  public setVolume(value: number) {
    this.audioLocal.volume = Math.max(0, Math.min(1, value));
    this.audioExternal.volume = Math.max(0, Math.min(1, value));
    if (this.gainNode && this.activeCore === 'local') {
      this.gainNode.gain.setValueAtTime(value, this.audioCtx?.currentTime || 0);
    }
  }

  public setEqualizerBand(index: number, gainValue: number) {
    if (index >= 0 && index < this.currentPresetGains.length) {
      this.currentPresetGains[index] = gainValue;
    }
    if (this.isInitialized && index < this.filters.length) {
      this.filters[index].gain.setValueAtTime(gainValue, this.audioCtx?.currentTime || 0);
    }
  }

  public applyPreset(gains: number[]) {
    gains.forEach((gain, index) => {
      this.setEqualizerBand(index, gain);
    });
  }

  public getAnalyserData(): Uint8Array {
    if (this.activeCore !== 'local' || !this.analyser) {
      // Simulate random analyser data for external files to keep visualizer beautifully animated!
      const mockData = new Uint8Array(64);
      for (let i = 0; i < 64; i++) {
        mockData[i] = Math.max(10, Math.floor(Math.random() * 80 + Math.sin(i * 0.4 + Date.now() * 0.01) * 30));
      }
      return mockData;
    }
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }

  public updateMediaSession(song: { title: string; artist: string; album?: string; artwork?: string }, onPlay: () => void, onPause: () => void, onNext: () => void, onPrev: () => void) {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title,
        artist: song.artist,
        album: song.album || 'Sur Offline',
        artwork: [
          { src: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop', sizes: '300x300', type: 'image/jpeg' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', onPlay);
      navigator.mediaSession.setActionHandler('pause', onPause);
      navigator.mediaSession.setActionHandler('previoustrack', onPrev);
      navigator.mediaSession.setActionHandler('nexttrack', onNext);
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          this.seek(details.seekTime);
        }
      });
    }
  }

  // Helper to bind standard listeners to both cores
  public addEventListener(type: string, listener: EventListener) {
    this.audioLocal.addEventListener(type, listener);
    this.audioExternal.addEventListener(type, listener);
  }

  public removeEventListener(type: string, listener: EventListener) {
    this.audioLocal.removeEventListener(type, listener);
    this.audioExternal.removeEventListener(type, listener);
  }
}

export const audioEngine = new AudioEngine();
