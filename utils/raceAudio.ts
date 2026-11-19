// utils/raceAudio.ts
//
// Starting-tree tones, synthesized in the browser. No audio files, no network. Sound is
// opt-in: nothing here runs until the visitor turns it on, and that click is the gesture
// browsers require before audio may start.

export type RaceTone = 'amber' | 'green' | 'finish';

type AudioContextCtor = typeof AudioContext;

let context: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (context) return context;
  const Ctor: AudioContextCtor | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    context = new Ctor();
  } catch {
    context = null;
  }
  return context;
}

/** Call from a click handler so the browser allows later tones. */
export function primeRaceAudio(): void {
  const ctx = getContext();
  if (ctx && ctx.state === 'suspended') void ctx.resume().catch(() => {});
}

const TONES: Record<RaceTone, { notes: { hz: number; at: number; ms: number }[]; type: OscillatorType }> = {
  // Short, dry blips for each amber, like a timing system's stage beep.
  amber: { type: 'square', notes: [{ hz: 440, at: 0, ms: 90 }] },
  // One longer, higher tone for green.
  green: { type: 'square', notes: [{ hz: 880, at: 0, ms: 320 }] },
  // Two rising notes when the last lane is in.
  finish: { type: 'triangle', notes: [{ hz: 660, at: 0, ms: 110 }, { hz: 990, at: 130, ms: 220 }] },
};

export function playRaceTone(tone: RaceTone): void {
  const ctx = getContext();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    const { notes, type } = TONES[tone];
    for (const note of notes) {
      const start = ctx.currentTime + note.at / 1000;
      const end = start + note.ms / 1000;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(note.hz, start);
      // Quiet, with a fast attack and release so the tone never clicks.
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.05, start + 0.008);
      gain.gain.setValueAtTime(0.05, Math.max(start + 0.008, end - 0.03));
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(end + 0.02);
    }
  } catch {
    // Audio is decoration. A browser that refuses it changes nothing about the race.
  }
}
