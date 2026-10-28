// Optional, locally synthesized atmosphere. No network assets or autoplay audio.
import { foleyCuesFor, STORY_CUES } from './story-cues.js';

export class Soundscape {
  constructor() { this.enabled = false; this.context = null; this.voices = new Set(); this.previous = null; }

  async toggle() {
    if (!this.context) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return false;
      this.context = new Audio();
      const ctx = this.context;
      this.master = ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(ctx.destination);
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
      this.buffer = buffer;
      const data = buffer.getChannelData(0);
      let seed = 731;
      for (let i = 0; i < data.length; i++) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        data[i] = seed / 2147483648 - 1;
      }
      this.noise = ctx.createBufferSource();
      this.noise.buffer = buffer; this.noise.loop = true;
      this.filter = ctx.createBiquadFilter(); this.filter.type = 'lowpass';
      this.noise.connect(this.filter); this.filter.connect(this.master);
      this.noise.start();
    }
    this.enabled = !this.enabled;
    if (this.enabled) await this.context.resume();
    else this.silence();
    return this.enabled;
  }

  update(chapter, seconds, playing) {
    if (!this.context) return;
    const ctx = this.context;
    const rain = chapter.id === 'storm';
    const wind = chapter.id === 'weather-turns';
    const gust = 0.82 + 0.18 * Math.sin(seconds * 0.71);
    const ending = chapter.id === 'summer'
      ? Math.min(1, Math.max(0, (STORY_CUES.summer.soundFadeStart - seconds) / 3)) : 1;
    const level = this.enabled && playing ? (rain ? 0.13 : wind ? 0.075 : 0.018) * gust * ending : 0;
    this.master.gain.setTargetAtTime(level, ctx.currentTime, 0.12);
    this.filter.frequency.setTargetAtTime(rain ? 5400 : wind ? 850 : 420, ctx.currentTime, 0.2);
    // Only crossing a cue during continuous playback triggers foley; seeks don't.
    const previous = this.previous;
    this.previous = playing ? { id: chapter.id, seconds } : null;
    if (this.enabled && playing && previous?.id === chapter.id &&
        seconds > previous.seconds && seconds - previous.seconds < 0.25) {
      // Cue names/times live in story-cues.js; the joy gait's four foot plants
      // are ordinary foley crossings here, so seeks stay silent like the rest.
      for (const cue of foleyCuesFor(chapter.id)) {
        if (previous.seconds < cue.at && seconds >= cue.at) this.foley(cue.kind, cue);
      }
    }
  }

  foley(kind, cue = {}) {
    const ctx = this.context, gain = ctx.createGain(), filter = ctx.createBiquadFilter();
    const ceramic = kind === 'ceramic';
    const footstep = kind === 'footstep';
    const source = ceramic ? ctx.createOscillator() : ctx.createBufferSource();
    if (ceramic) { source.type = 'sine'; source.frequency.value = 920; }
    else source.buffer = this.buffer;
    const length = kind === 'tape' ? 0.32 : footstep ? 0.16 : 0.18;
    filter.type = footstep ? 'lowpass' : 'bandpass';
    filter.frequency.value = footstep ? (cue.side === 'L' ? 190 : 230)
      : kind === 'tape' ? 2800 : 700;
    filter.Q.value = ceramic ? 1 : 0.6;
    source.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    // Footsteps are a short, dark noise thump on the deck; alternating sides
    // vary the filter slightly without panning the mono ambience.
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(footstep ? 0.045 : ceramic ? 0.035 : 0.065,
      ctx.currentTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + length);
    source.start(); source.stop(ctx.currentTime + length);
    const voice = { source, gain, filter }; this.voices.add(voice);
    source.onended = () => {
      source.disconnect(); gain.disconnect(); filter.disconnect(); this.voices.delete(voice);
    };
  }

  silence() {
    this.previous = null;
    for (const voice of this.voices) voice.source.stop();
    if (this.context) this.master.gain.setTargetAtTime(0, this.context.currentTime, 0.025);
  }
  dispose() { this.noise?.stop(); this.context?.close(); }
}
