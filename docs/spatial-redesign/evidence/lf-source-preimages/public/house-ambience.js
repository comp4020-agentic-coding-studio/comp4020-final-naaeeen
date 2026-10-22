// Original procedural ambience: no recordings, downloads, dependencies or shared playback.
const PRESETS = new Set(["rain", "fire", "night"]);
const MAX_GAIN = 0.18;
const FADE_SECONDS = 0.08;

/**
 * @typedef {{ preset: string, state: string, volume: number, muted: boolean, message: string }} AmbienceStatus
 * @param {{ AudioContext?: (new () => AudioContext) | null, onStatus?: (status: AmbienceStatus) => void }} [options]
 */
export function createHouseAmbience({ AudioContext: ContextConstructor = globalThis.AudioContext ?? globalThis.webkitAudioContext, onStatus = () => {} } = {}) {
  /** @type {AmbienceStatus} */
  let current = { preset: "off", state: "off", volume: 0.3, muted: false, message: "Sound is off." };
  let active = null, retiring = null, generation = 0, disposed = false;
  const status = () => ({ ...current });
  const report = patch => {
    current = { ...current, ...patch };
    // UI callbacks cannot take ownership of the audio lifecycle or mutate its state.
    try { onStatus(status()); } catch { /* Audio cleanup must survive a failed UI update. */ }
    return status();
  };

  function release(session) {
    if (!session || session.released) return;
    session.released = true;
    clearTimeout(session.timer);
    if (retiring === session) retiring = null;
    session.context.onstatechange = null;
    if (session.source) {
      if (!session.stopped) {
        try { session.source.stop(); } catch { /* An unstarted/ended source has nothing to stop. */ }
        session.stopped = true;
      }
      try { session.source.disconnect(); } catch { /* Already disconnected. */ }
      session.source.buffer = null;
    }
    try { session.gain?.disconnect(); } catch { /* Already disconnected. */ }
    // close() releases hardware, while explicit disconnection releases our graph references.
    try { Promise.resolve(session.context.close()).catch(() => {}); } catch { /* Already closed. */ }
  }

  function ramp(session, target) {
    const parameter = session.gain.gain, now = session.context.currentTime;
    if (typeof parameter.cancelAndHoldAtTime === "function") parameter.cancelAndHoldAtTime(now);
    else {
      parameter.cancelScheduledValues(now);
      parameter.setValueAtTime(parameter.value, now);
    }
    parameter.linearRampToValueAtTime(target, now + FADE_SECONDS);
  }

  function retire(fade) {
    // Rapid switching keeps at most the current graph plus one short retiring graph.
    release(retiring);
    const session = active;
    active = null;
    if (!session) return;
    session.cancel();
    if (fade && session.started && session.context.state === "running") {
      try {
        ramp(session, 0);
        session.source.stop(session.context.currentTime + FADE_SECONDS);
        session.stopped = true;
        retiring = session;
        session.timer = setTimeout(() => release(session), (FADE_SECONDS + 0.02) * 1000);
        return;
      } catch { /* A failed fade still requires immediate teardown. */ }
    }
    release(session);
  }

  function stop() {
    generation += 1;
    retire(true);
    return report({ preset: "off", state: "off", message: "Sound is off." });
  }

  function fail(session, message, preset) {
    if (active === session) active = null;
    session?.cancel();
    release(session);
    return report({ preset, state: "error", message });
  }

  async function listen(preset) {
    if (disposed) return status();
    if (preset === "off") return stop();
    if (!PRESETS.has(preset)) {
      stop();
      return report({ state: "error", message: "Choose Rain, Fire or Night to listen." });
    }
    if (active?.started && current.preset === preset) return status();
    const request = ++generation;
    retire(true);
    report({ preset, state: "starting", message: "Starting sound…" });
    if (request !== generation || disposed) return status();
    if (!ContextConstructor) return report({ state: "error", message: "Audio is unavailable in this browser." });
    let session = null;
    try {
      const context = new ContextConstructor();
      let cancel;
      const cancelled = new Promise(resolve => { cancel = () => resolve(false); });
      session = { context, source: null, gain: null, started: false, stopped: false, released: false, timer: undefined, cancel };
      active = session;
      // Call resume synchronously within Listen's gesture; never queue a later automatic retry.
      const resumed = context.state === "running" ? Promise.resolve(true) : Promise.resolve(context.resume()).then(() => true);
      const started = await Promise.race([resumed, cancelled]);
      if (!started || active !== session || request !== generation || disposed) {
        release(session);
        return status();
      }
      if (context.state !== "running") throw new Error("Audio context did not start");
      const buffer = makeAmbienceBuffer(context, preset);
      session.source = context.createBufferSource();
      session.gain = context.createGain();
      session.gain.gain.setValueAtTime(0, context.currentTime);
      session.source.buffer = buffer;
      session.source.loop = true;
      session.source.connect(session.gain);
      session.gain.connect(context.destination);
      session.source.start();
      session.started = true;
      ramp(session, current.muted ? 0 : current.volume * MAX_GAIN);
      context.onstatechange = () => {
        if (active === session && session.started && context.state !== "running") {
          fail(session, "Audio was interrupted. Select Listen to try again.", preset);
        }
      };
      return report({ preset, state: "playing", message: current.muted ? "Sound is muted." : "Sound is playing on this device." });
    } catch {
      if (request !== generation || disposed || (session && active !== session)) {
        release(session);
        return status();
      }
      return fail(session, "Audio could not start. Select Listen to try again.", preset);
    }
  }

  function updateLevel() {
    if (active?.started) {
      try { ramp(active, current.muted ? 0 : current.volume * MAX_GAIN); }
      catch { return fail(active, "Audio was interrupted. Select Listen to try again.", current.preset); }
    }
    return report(current.state === "playing" ? { message: current.muted ? "Sound is muted." : "Sound is playing on this device." } : {});
  }

  return {
    listen, stop, status,
    setVolume(value) {
      if (disposed || !Number.isFinite(value)) return status();
      current = { ...current, volume: Math.min(1, Math.max(0, value)) };
      return updateLevel();
    },
    setMuted(value) {
      if (disposed) return status();
      current = { ...current, muted: Boolean(value) };
      return updateLevel();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      stop();
    },
  };
}

function makeAmbienceBuffer(context, preset) {
  // One mono buffer, capped at 144,000 samples (576 KB), and one looping source.
  const rate = Math.max(8_000, Math.min(48_000, context.sampleRate));
  const buffer = context.createBuffer(1, rate * 3, rate), samples = buffer.getChannelData(0);
  let brown = 0, crackle = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const noise = Math.random() * 2 - 1, time = i / rate;
    brown = (brown + noise * 0.025) / 1.025;
    crackle = Math.random() < 0.0005 ? 0.6 : crackle * 0.994;
    let value;
    if (preset === "rain") value = noise * 0.4 + brown * 0.25;
    else if (preset === "fire") value = brown * 1.8 + crackle * noise;
    else {
      const chirp = Math.max(0, Math.sin(time * 9.7 + Math.sin(time * 3.1))) ** 16;
      value = brown * 0.2 + Math.sin(time * Math.PI * 2 * 3_200) * chirp * 0.1;
    }
    // Smooth the loop's endpoints to avoid a hard waveform discontinuity.
    const edge = Math.min(1, i / (rate * 0.012), (samples.length - 1 - i) / (rate * 0.012));
    samples[i] = Math.max(-0.8, Math.min(0.8, value)) * edge;
  }
  return buffer;
}
