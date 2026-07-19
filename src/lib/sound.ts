// A short synthesized "tick" for button presses - generated in code rather
// than loaded from an audio file, so there's no binary asset to manage.
let ctx: AudioContext | null = null;

export function playClick() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!ctx) ctx = new AudioCtx();
    if (ctx.state === "suspended") ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 700;
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.035);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.035);
  } catch {
    // Web Audio unavailable in this browser - sound is a nice-to-have, fail silently.
  }
}
