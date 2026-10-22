import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createHouseAmbience } from "../public/house-ambience.js";

class AudioParamMock {
  value = 1;
  events: { type: string; value?: number; time: number }[] = [];
  setValueAtTime(value: number, time: number) { this.value = value; this.events.push({ type: "set", value, time }); return this; }
  linearRampToValueAtTime(value: number, time: number) { this.value = value; this.events.push({ type: "ramp", value, time }); return this; }
  cancelAndHoldAtTime(time: number) { this.events.push({ type: "hold", time }); return this; }
  cancelScheduledValues(time: number) { this.events.push({ type: "cancel", time }); return this; }
}
class AudioNodeMock {
  disconnected = false;
  connections: unknown[] = [];
  connect(node: unknown) { if (AudioContextMock.failAt === "connect") throw new Error("fixture connect failure"); this.connections.push(node); return node; }
  disconnect() { this.disconnected = true; this.connections = []; }
}
class SourceMock extends AudioNodeMock {
  buffer: { samples: Float32Array } | null = null;
  loop = false;
  started = false;
  stops: number[] = [];
  start() { if (AudioContextMock.failAt === "start") throw new Error("fixture start failure"); this.started = true; }
  stop(time = 0) { this.stops.push(time); }
}
class GainMock extends AudioNodeMock { gain = new AudioParamMock(); }
class AudioContextMock {
  static instances: AudioContextMock[] = [];
  static failAt = "";
  static runningOnResume = true;
  static resumeImpl: () => Promise<void> = async () => {};
  state = "suspended";
  currentTime = 10;
  sampleRate = 8_000;
  destination = {};
  sources: SourceMock[] = [];
  gains: GainMock[] = [];
  buffers: { samples: Float32Array; sampleRate: number }[] = [];
  onstatechange: (() => void) | null = null;
  constructor() {
    if (AudioContextMock.failAt === "constructor") throw new Error("fixture constructor failure");
    AudioContextMock.instances.push(this);
  }
  resume = vi.fn(async () => {
    await AudioContextMock.resumeImpl();
    if (AudioContextMock.runningOnResume && this.state !== "closed") this.state = "running";
  });
  close = vi.fn(async () => { this.state = "closed"; });
  createBuffer(_channels: number, frames: number, sampleRate: number) {
    if (AudioContextMock.failAt === "createBuffer") throw new Error("fixture buffer failure");
    const buffer = { samples: new Float32Array(frames), sampleRate, getChannelData() { return this.samples; } };
    this.buffers.push(buffer); return buffer;
  }
  createBufferSource() {
    if (AudioContextMock.failAt === "createBufferSource") throw new Error("fixture source failure");
    const source = new SourceMock(); this.sources.push(source); return source;
  }
  createGain() {
    if (AudioContextMock.failAt === "createGain") throw new Error("fixture gain failure");
    const gain = new GainMock(); this.gains.push(gain); return gain;
  }
}
function deferred() {
  let resolve!: () => void, reject!: (reason: Error) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const adapters: ReturnType<typeof createHouseAmbience>[] = [];
function adapter(onStatus = (_status: ReturnType<ReturnType<typeof createHouseAmbience>["status"]>) => {}) {
  const result = createHouseAmbience({ AudioContext: AudioContextMock as unknown as typeof AudioContext, onStatus });
  adapters.push(result); return result;
}
beforeEach(() => {
  vi.useFakeTimers(); AudioContextMock.instances = []; AudioContextMock.failAt = "";
  AudioContextMock.runningOnResume = true; AudioContextMock.resumeImpl = async () => {};
});
afterEach(async () => {
  adapters.splice(0).forEach(audio => audio.dispose());
  await vi.runAllTimersAsync(); vi.useRealTimers();
});

describe("explicit local house ambience", () => {
  test("constructing and changing local controls stays off without allocating audio", () => {
    const audio = adapter();
    expect(audio.status()).toEqual({ preset: "off", state: "off", volume: 0.3, muted: false, message: "Sound is off." });
    audio.setVolume(0.6); audio.setMuted(true); audio.stop();
    expect(AudioContextMock.instances).toHaveLength(0);
    expect(audio.status()).toMatchObject({ state: "off", preset: "off", volume: 0.6, muted: true });
  });

  test.each(["rain", "fire", "night"])("explicit Listen starts bounded original %s audio", async preset => {
    const statuses: unknown[] = [], audio = adapter(status => statuses.push(status));
    const result = await audio.listen(preset);
    const context = AudioContextMock.instances[0]!;
    expect(context.resume).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ state: "playing", preset, volume: 0.3, muted: false });
    expect(statuses).toEqual(expect.arrayContaining([expect.objectContaining({ state: "starting" }), expect.objectContaining({ state: "playing" })]));
    expect(context.sources).toHaveLength(1);
    expect(context.sources[0]).toMatchObject({ started: true, loop: true });
    const buffer = context.buffers[0]!;
    expect(buffer.samples.length).toBeGreaterThanOrEqual(buffer.sampleRate);
    expect(buffer.samples.length).toBeLessThanOrEqual(48_000 * 3);
    expect(buffer.samples.some(value => value !== 0)).toBe(true);
    expect(buffer.samples.every(value => Number.isFinite(value) && Math.abs(value) <= 1)).toBe(true);
    expect(context.sources[0]!.connections).toEqual([context.gains[0]]);
    expect(context.gains[0]!.connections).toEqual([context.destination]);
    expect(context.gains[0]!.gain.value).toBeGreaterThan(0);
    expect(context.gains[0]!.gain.value).toBeLessThanOrEqual(0.18);
  });

  test("volume is clamped and mute preserves the chosen volume", async () => {
    const audio = adapter(); await audio.listen("rain");
    const gain = AudioContextMock.instances[0]!.gains[0]!.gain;
    audio.setVolume(2); expect(audio.status().volume).toBe(1); expect(gain.value).toBeLessThanOrEqual(0.18);
    audio.setMuted(true); expect(gain.value).toBe(0);
    audio.setVolume(0.7); expect(gain.value).toBe(0);
    audio.setMuted(false); expect(gain.value).toBeCloseTo(0.18 * 0.7);
    audio.setVolume(-1); expect(gain.value).toBe(0); expect(audio.status().volume).toBe(0);
    audio.setVolume(Number.NaN); expect(audio.status().volume).toBe(0);
  });

  test("Stop marks off immediately, fades, then releases sources and context", async () => {
    const audio = adapter(); await audio.listen("fire");
    const context = AudioContextMock.instances[0]!, source = context.sources[0]!, gain = context.gains[0]!;
    audio.stop();
    expect(audio.status()).toMatchObject({ state: "off", preset: "off" });
    expect(gain.gain.events.at(-1)).toMatchObject({ type: "ramp", value: 0 });
    expect(source.stops[0]).toBeGreaterThan(context.currentTime);
    expect(source.stops[0]).toBeLessThanOrEqual(context.currentTime + 0.1);
    expect(context.close).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(150);
    expect(context.close).toHaveBeenCalledOnce();
    expect(source.disconnected).toBe(true); expect(source.buffer).toBeNull(); expect(gain.disconnected).toBe(true);
  });

  test("Stop and Dispose are idempotent and a disposed adapter cannot restart", async () => {
    const audio = adapter(); await audio.listen("night");
    const context = AudioContextMock.instances[0]!;
    audio.stop(); audio.stop(); audio.dispose(); audio.dispose();
    await vi.runAllTimersAsync();
    expect(context.close).toHaveBeenCalledOnce(); expect(context.sources[0]!.stops).toHaveLength(1);
    expect(await audio.listen("rain")).toMatchObject({ state: "off", preset: "off" });
    expect(AudioContextMock.instances).toHaveLength(1);
  });

  test("Stop closes a pending resume and settles Listen before resume finishes", async () => {
    const resume = deferred(); AudioContextMock.resumeImpl = () => resume.promise;
    const audio = adapter(), listening = audio.listen("rain"), context = AudioContextMock.instances[0]!;
    expect(audio.status().state).toBe("starting"); audio.stop();
    expect(await listening).toMatchObject({ state: "off", preset: "off" });
    expect(context.close).toHaveBeenCalledOnce(); expect(context.sources).toHaveLength(0);
    resume.resolve(); await Promise.resolve(); await Promise.resolve();
    expect(context.sources).toHaveLength(0); expect(audio.status().state).toBe("off");
  });

  test("a newer Listen wins over an earlier pending resume", async () => {
    const resume = deferred(); AudioContextMock.resumeImpl = () => resume.promise;
    const audio = adapter(), first = audio.listen("rain"), old = AudioContextMock.instances[0]!;
    AudioContextMock.resumeImpl = async () => {};
    expect(await audio.listen("night")).toMatchObject({ state: "playing", preset: "night" });
    resume.resolve(); await first;
    expect(old.close).toHaveBeenCalledOnce(); expect(old.sources).toHaveLength(0);
    expect(audio.status()).toMatchObject({ state: "playing", preset: "night" });
  });

  test("an old rejected resume cannot replace a newer result or reject unhandled", async () => {
    const resume = deferred(); AudioContextMock.resumeImpl = () => resume.promise;
    const audio = adapter(), first = audio.listen("rain"); audio.stop(); await first;
    AudioContextMock.resumeImpl = async () => {}; await audio.listen("fire");
    resume.reject(new Error("late fixture failure")); await Promise.resolve(); await Promise.resolve();
    expect(audio.status()).toMatchObject({ state: "playing", preset: "fire" });
  });

  test("unsupported audio reports unavailable without allocating or throwing", async () => {
    const audio = createHouseAmbience({ AudioContext: null }); adapters.push(audio);
    expect(await audio.listen("rain")).toMatchObject({ state: "error", message: expect.stringMatching(/unavailable/i) });
    expect(AudioContextMock.instances).toHaveLength(0);
  });

  test.each(["constructor", "createBuffer", "createBufferSource", "createGain", "connect", "start"])("%s failure is honest and releases any partial graph", async failure => {
    AudioContextMock.failAt = failure;
    const audio = adapter();
    expect(await audio.listen("rain")).toMatchObject({ state: "error", message: expect.stringMatching(/could not start/i) });
    for (const context of AudioContextMock.instances) {
      expect(context.close).toHaveBeenCalledOnce();
      expect(context.sources.every(source => source.disconnected && source.buffer === null)).toBe(true);
      expect(context.gains.every(gain => gain.disconnected)).toBe(true);
    }
    AudioContextMock.failAt = "";
    expect(await audio.listen("fire")).toMatchObject({ state: "playing", preset: "fire" });
  });

  test("a rejected resume closes the context and permits a later explicit retry", async () => {
    AudioContextMock.resumeImpl = async () => { throw new Error("NotAllowedError: fixture browser policy"); };
    const audio = adapter();
    expect(await audio.listen("rain")).toMatchObject({ state: "error" });
    expect(AudioContextMock.instances[0]!.close).toHaveBeenCalledOnce();
    expect(AudioContextMock.instances[0]!.sources).toHaveLength(0);
    AudioContextMock.resumeImpl = async () => {};
    expect(await audio.listen("rain")).toMatchObject({ state: "playing" });
  });

  test("a resume that remains suspended is not reported as playing", async () => {
    AudioContextMock.runningOnResume = false;
    const audio = adapter();
    expect(await audio.listen("night")).toMatchObject({ state: "error" });
    expect(AudioContextMock.instances[0]!.sources).toHaveLength(0);
    expect(AudioContextMock.instances[0]!.close).toHaveBeenCalledOnce();
  });

  test("unexpected audio interruption stops and reports a retryable error", async () => {
    const audio = adapter(); await audio.listen("rain");
    const context = AudioContextMock.instances[0]!; context.state = "suspended"; context.onstatechange?.();
    expect(audio.status()).toMatchObject({ state: "error", message: expect.stringMatching(/interrupted/i) });
    expect(context.close).toHaveBeenCalledOnce(); expect(context.sources[0]!.disconnected).toBe(true);
  });

  test("rapid preset changes keep at most one retiring context and cannot be revived by local controls", async () => {
    const audio = adapter(); await audio.listen("rain"); await audio.listen("fire"); await audio.listen("night");
    expect(AudioContextMock.instances[0]!.close).toHaveBeenCalledOnce();
    expect(AudioContextMock.instances.filter(context => context.state !== "closed")).toHaveLength(2);
    audio.stop(); audio.setVolume(1); audio.setMuted(false);
    await vi.runAllTimersAsync();
    expect(AudioContextMock.instances.every(context => context.state === "closed")).toBe(true);
    expect(audio.status().state).toBe("off");
  });

  test("Off and invalid presets cannot leave earlier audio running", async () => {
    const audio = adapter(); await audio.listen("rain");
    expect(await audio.listen("off")).toMatchObject({ state: "off", preset: "off" });
    expect(await audio.listen("unknown")).toMatchObject({ state: "error", preset: "off" });
    await vi.runAllTimersAsync(); expect(AudioContextMock.instances[0]!.close).toHaveBeenCalledOnce();
    expect(AudioContextMock.instances).toHaveLength(1);
  });

  test("callback failures and mutated status snapshots cannot change audio state", async () => {
    const audio = adapter(() => { throw new Error("fixture UI callback failure"); });
    expect(await audio.listen("rain")).toMatchObject({ state: "playing" });
    const snapshot = audio.status(); snapshot.volume = 1; snapshot.state = "error";
    expect(audio.status()).toMatchObject({ volume: 0.3, state: "playing" });
  });
});
