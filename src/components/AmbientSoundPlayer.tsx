import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';

/**
 * AmbientSoundPlayer
 * -----------------
 * Invisible singleton that owns the WebAudio graph for the selected ambient
 * sound. Mount once near the app root (in App.tsx). Reacting to store
 * changes for `ambient.kind` and `ambient.volume` is enough — the player
 * starts/stops the right noise generator and ramps the gain in place.
 *
 * Why Web Audio instead of bundled audio files:
 *  - Zero asset payload (no .mp3/.ogg to ship + Electron loader path)
 *  - Procedurally generated → no licensing issues
 *  - Smooth gain ramping avoids the "click" you get with a `<audio>` element
 */
export function AmbientSoundPlayer(): null {
  const ambient = useStore((s) => s.ambient);
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const sourceRef = useRef<{ stop: () => void } | null>(null);

  // Lazily create the AudioContext on first user gesture (browsers require it).
  const ensureCtx = (): AudioContext | null => {
    if (typeof window === 'undefined') return null;
    if (!ctxRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return null;
      ctxRef.current = new Ctor();
    }
    if (ctxRef.current.state === 'suspended') {
      // Fire-and-forget — resume failure is non-fatal.
      void ctxRef.current.resume();
    }
    return ctxRef.current;
  };

  // Start/stop the noise generator when `kind` changes.
  useEffect(() => {
    if (ambient.kind === 'off') {
      if (sourceRef.current) {
        sourceRef.current.stop();
        sourceRef.current = null;
      }
      if (gainRef.current && ctxRef.current) {
        // Quick fade-out to avoid the click.
        gainRef.current.gain.linearRampToValueAtTime(0, ctxRef.current.currentTime + 0.05);
      }
      return;
    }

    const ctx = ensureCtx();
    if (!ctx) return;

    // Build a fresh gain node on every (re)start so we start at 0 and ramp up.
    if (gainRef.current) {
      try {
        gainRef.current.disconnect();
      } catch {
        /* already disconnected */
      }
    }
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(ctx.destination);
    gainRef.current = gain;
    // Apply current volume right away.
    gain.gain.linearRampToValueAtTime(
      Math.max(0, Math.min(1, ambient.volume / 100)),
      ctx.currentTime + 0.3,
    );

    if (sourceRef.current) {
      sourceRef.current.stop();
      sourceRef.current = null;
    }

    const handle = startGenerator(ctx, gain, ambient.kind);
    sourceRef.current = { stop: handle.stop };

    return () => {
      // No-op — the next effect run owns the cleanup.
    };
  }, [ambient.kind]);

  // Apply volume changes without restarting the source.
  useEffect(() => {
    const gain = gainRef.current;
    const ctx = ctxRef.current;
    if (!gain || !ctx || !sourceRef.current) return;
    gain.gain.linearRampToValueAtTime(
      Math.max(0, Math.min(1, ambient.volume / 100)),
      ctx.currentTime + 0.1,
    );
  }, [ambient.volume]);

  // Tear down on unmount.
  useEffect(() => {
    return () => {
      if (sourceRef.current) sourceRef.current.stop();
      if (gainRef.current) {
        try {
          gainRef.current.disconnect();
        } catch {
          /* ignore */
        }
      }
      if (ctxRef.current) {
        void ctxRef.current.close();
      }
    };
  }, []);

  return null;
}

// ── Generators ──────────────────────────────────────────────────────────────

interface GeneratorHandle {
  stop: () => void;
}

/**
 * Create a looping noise source for the given sound kind, piped through the
 * shared gain node. The returned handle must be called to clean up.
 */
function startGenerator(ctx: AudioContext, dest: GainNode, kind: 'rain' | 'forest' | 'whiteNoise'): GeneratorHandle {
  if (kind === 'rain') return startRain(ctx, dest);
  if (kind === 'forest') return startForest(ctx, dest);
  return startWhiteNoise(ctx, dest);
}

/**
 * Brown-ish noise filtered to feel like steady rainfall.
 */
function startRain(ctx: AudioContext, dest: GainNode): GeneratorHandle {
  const bufferSize = 2 * ctx.sampleRate;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    // 1st-order low-pass → smooths white noise into rain-like texture.
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.5;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  // High-shelf to give the "patter" of raindrops.
  const highShelf = ctx.createBiquadFilter();
  highShelf.type = 'highshelf';
  highShelf.frequency.value = 2500;
  highShelf.gain.value = 4;

  source.connect(highShelf);
  highShelf.connect(dest);
  source.start();

  return {
    stop() {
      try {
        source.stop();
      } catch {
        /* already stopped */
      }
      try {
        source.disconnect();
        highShelf.disconnect();
      } catch {
        /* ignore */
      }
    },
  };
}

/**
 * Forest: pink-ish noise modulated by a slow LFO so it sounds like wind in
 * trees. Simpler than a real forest texture but distinct from rain.
 */
function startForest(ctx: AudioContext, dest: GainNode): GeneratorHandle {
  const bufferSize = 4 * ctx.sampleRate;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    // Paul Kellet's pink-noise filter approximation.
    b0 = 0.99765 * b0 + white * 0.099046;
    b1 = 0.96300 * b1 + white * 0.2965164;
    b2 = 0.57000 * b2 + white * 1.0526913;
    data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.18;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1200;
  filter.Q.value = 0.6;

  // Slow LFO so the volume ebbs like wind gusts.
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.55;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.18;
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);

  source.connect(filter);
  filter.connect(dest);
  source.start();
  lfo.start();

  return {
    stop() {
      try {
        source.stop();
        lfo.stop();
      } catch {
        /* already stopped */
      }
      try {
        source.disconnect();
        filter.disconnect();
        lfo.disconnect();
        lfoGain.disconnect();
      } catch {
        /* ignore */
      }
    },
  };
}

/**
 * Plain white noise — flat spectrum, no filtering. Great for masking
 * chatter when you're really trying to power through.
 */
function startWhiteNoise(ctx: AudioContext, dest: GainNode): GeneratorHandle {
  const bufferSize = 2 * ctx.sampleRate;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.45;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(dest);
  source.start();

  return {
    stop() {
      try {
        source.stop();
      } catch {
        /* already stopped */
      }
      try {
        source.disconnect();
      } catch {
        /* ignore */
      }
    },
  };
}
