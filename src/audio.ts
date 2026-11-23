// Tiny synthesized sound effects with the Web Audio API. No audio files.
// The AudioContext is created on first use, which is always after a user tap.

export type SoundName = 'click' | 'warning' | 'burn' | 'success';

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
    if (!ctx) {
        const Ctor =
            window.AudioContext ??
            (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        try {
            ctx = new Ctor();
        } catch {
            return null;
        }
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
}

interface Tone {
    type: OscillatorType;
    freq: number;
    endFreq?: number;
    start?: number;
    duration: number;
    volume: number;
}

function tone(ac: AudioContext, t: Tone): void {
    const at = ac.currentTime + (t.start ?? 0);
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = t.type;
    osc.frequency.setValueAtTime(t.freq, at);
    if (t.endFreq) osc.frequency.exponentialRampToValueAtTime(t.endFreq, at + t.duration);
    gain.gain.setValueAtTime(t.volume, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + t.duration);
    osc.connect(gain).connect(ac.destination);
    osc.start(at);
    osc.stop(at + t.duration + 0.02);
}

function noise(ac: AudioContext, duration: number, volume: number): void {
    const length = Math.floor(ac.sampleRate * duration);
    const buffer = ac.createBuffer(1, length, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource();
    src.buffer = buffer;
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2400, ac.currentTime);
    filter.frequency.exponentialRampToValueAtTime(200, ac.currentTime + duration);
    const gain = ac.createGain();
    gain.gain.setValueAtTime(volume, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);
    src.connect(filter).connect(gain).connect(ac.destination);
    src.start();
}

export function playSound(name: SoundName): void {
    const ac = context();
    if (!ac) return;
    switch (name) {
        case 'click':
            tone(ac, { type: 'square', freq: 660, duration: 0.05, volume: 0.05 });
            break;
        case 'warning':
            tone(ac, { type: 'square', freq: 440, duration: 0.15, volume: 0.06 });
            tone(ac, { type: 'square', freq: 440, start: 0.22, duration: 0.15, volume: 0.06 });
            break;
        case 'burn':
            noise(ac, 0.7, 0.25);
            tone(ac, { type: 'sawtooth', freq: 120, endFreq: 40, duration: 0.6, volume: 0.08 });
            break;
        case 'success':
            tone(ac, { type: 'triangle', freq: 523, duration: 0.12, volume: 0.1 });
            tone(ac, { type: 'triangle', freq: 784, start: 0.1, duration: 0.2, volume: 0.1 });
            break;
    }
}
