/* Owns the actual audio playback for Focus Sounds. Lives in an offscreen document rather than
   the sidebar iframe or the background service worker: an offscreen document is the one place
   in a Manifest V3 extension whose audio survives after the tab/panel that requested it closes
   or the service worker itself gets torn down. background/background.js creates this document
   on first play and relays sidebar control messages into it; this file never talks to the
   sidebar directly. */
(function () {
  const audio = document.getElementById('player');

  let audioCtx = null;
  // Every generator (see GENERATORS below) connects to this single gain node, which is what
  // volume control and stop actually act on - individual generators don't need to know about
  // volume or each other.
  let masterGain = null;
  // A Web Audio AudioBufferSourceNode/OscillatorNode can only ever be start()'d once - there is
  // no pause/resume, only stop-and-discard. So both "switch track" and "pause" tear this down,
  // and every play (including a plain resume) rebuilds from scratch. For noise and drones that
  // restart is inaudible; it's the same reason file-based playback below always restarts a
  // track from 0 too.
  let activeGenerator = null;
  let currentVolume = 0.6;

  function getAudioCtx() {
    if (!audioCtx) audioCtx = new AudioContext();
    return audioCtx;
  }

  // 4 seconds is long enough that the loop seam is inaudible under noise, and short enough to
  // build instantly - no need to bundle audio for these two categories at all.
  function buildNoiseBuffer(type) {
    const ctx = getAudioCtx();
    const seconds = 4;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    if (type === 'brown') {
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5; // the leaky integration above damps amplitude; restore it here
      }
    } else {
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // A slow oscillator wired into an AudioParam instead of read in a loop - the idiomatic way
  // to get organic, drifting movement (rain intensity, wave swell, drone motion) out of the
  // Web Audio graph without a ScriptProcessor/AudioWorklet. Connecting to a param is additive
  // on top of its own .value, so callers pick `depth` small enough to stay in a sane range.
  function addLFO(ctx, param, rate, depth) {
    const lfo = ctx.createOscillator();
    lfo.frequency.value = rate;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = depth;
    lfo.connect(lfoDepth).connect(param);
    lfo.start();
    return lfo;
  }

  function disconnectAll(nodes) {
    nodes.forEach((n) => {
      if (n.stop) {
        try {
          n.stop();
        } catch (e) {
          // Already stopped - nothing left to tear down.
        }
      }
      n.disconnect();
    });
  }

  function playLoopedNoise(ctx, out, type) {
    const source = ctx.createBufferSource();
    source.buffer = buildNoiseBuffer(type);
    source.loop = true;
    source.connect(out);
    source.start();
    return { stop: () => disconnectAll([source]) };
  }

  function playRain(ctx, out) {
    const source = ctx.createBufferSource();
    source.buffer = buildNoiseBuffer('white');
    source.loop = true;

    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 1200;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 6000;

    const bedGain = ctx.createGain();
    bedGain.gain.value = 0.8;
    const lfo = addLFO(ctx, bedGain.gain, 0.15, 0.15); // subtle drift in rain intensity

    source.connect(highpass).connect(lowpass).connect(bedGain).connect(out);
    source.start();

    return { stop: () => disconnectAll([source, highpass, lowpass, bedGain, lfo]) };
  }

  function playOcean(ctx, out) {
    const source = ctx.createBufferSource();
    source.buffer = buildNoiseBuffer('brown');
    source.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 700;

    const waveGain = ctx.createGain();
    waveGain.gain.value = 0.5;
    // A slower, deeper swing than rain's - this is what turns flat filtered noise into a
    // crash-and-recede wave rhythm instead of a static hiss.
    const lfo = addLFO(ctx, waveGain.gain, 0.12, 0.4);

    source.connect(lowpass).connect(waveGain).connect(out);
    source.start();

    return { stop: () => disconnectAll([source, lowpass, waveGain, lfo]) };
  }

  // A handful of detuned oscillators through a slowly-sweeping lowpass filter - the standard
  // cheap way to get a warm, evolving drone out of plain OscillatorNodes with no samples.
  function playAmbientDrone(ctx, out, { base, ratios, wave, lfoRate, filterHz }) {
    const oscGain = ctx.createGain();
    oscGain.gain.value = 0.18; // several voices sum together - keep each one quiet

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterHz;
    filter.Q.value = 0.7;
    const lfo = addLFO(ctx, filter.frequency, lfoRate, filterHz * 0.4);

    const oscillators = ratios.map((ratio, i) => {
      const osc = ctx.createOscillator();
      osc.type = wave;
      // A few cents of detune per voice thickens the drone so it doesn't read as one flat
      // tone, without needing anything beyond plain OscillatorNodes.
      osc.frequency.value = base * ratio * (1 + (i - (ratios.length - 1) / 2) * 0.002);
      osc.connect(oscGain);
      osc.start();
      return osc;
    });

    oscGain.connect(filter).connect(out);

    return { stop: () => disconnectAll([...oscillators, lfo, oscGain, filter]) };
  }

  /* ---------- Generative Lo-fi / Classical ----------
     Lo-fi and Classical are chord-loop-plus-notes patterns, not recordings or a fake attempt at
     real production - a repeating progression is scheduled ahead of playback time, the same way
     a step sequencer works, using only oscillators and short filtered-noise hits. `scheduleLoop`
     is the shared engine both use: it takes a flat list of {t, play} hits (t = seconds into one
     loop) and re-fires the whole set every `loopSeconds`, using a plain recursive setTimeout
     rather than a lookahead ticker - simple enough because nothing here needs sample-accurate
     sync with anything outside itself. Individual hits still get sample-accurate Web Audio
     timing since play() receives an absolute AudioContext time, not "now". */
  function scheduleLoop(ctx, out, { hits, loopSeconds }) {
    let stopped = false;
    let timeoutId = null;

    function fireLoop(startTime) {
      hits.forEach((h) => h.play(ctx, out, startTime + h.t));
      // Schedule the next loop's notes shortly before this one ends, not exactly at the
      // boundary - the notes are already queued at their exact future AudioContext times
      // regardless of when this timer actually fires, so timer jitter here doesn't cause
      // audible jitter in playback.
      const msUntilNext = Math.max(0, (startTime + loopSeconds - ctx.currentTime - 0.25) * 1000);
      timeoutId = setTimeout(() => {
        if (!stopped) fireLoop(startTime + loopSeconds);
      }, msUntilNext);
    }

    fireLoop(ctx.currentTime + 0.05);

    return {
      stop() {
        stopped = true;
        if (timeoutId) clearTimeout(timeoutId);
        // Nodes already scheduled by past fireLoop() calls keep their queued start/stop times,
        // but they're connected through `out` (this generator's slice of masterGain), which
        // playGenerated()'s stopGenerated() disconnects from the destination right after this
        // returns - so nothing further has to happen here for them to end up inaudible.
      },
    };
  }

  // A short plucked/decaying tone (triangle fundamental + a quiet octave sine on top for a
  // brighter, less flat timbre) - the stand-in "piano" both Lo-fi's pads and Classical's
  // arpeggios are built from.
  function pianoNoteHit(t, freq, dur, gain) {
    return {
      t,
      play(ctx, out, at) {
        const osc1 = ctx.createOscillator();
        osc1.type = 'triangle';
        osc1.frequency.value = freq;
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = freq * 2;
        const overtoneGain = ctx.createGain();
        overtoneGain.gain.value = 0.25;
        const env = ctx.createGain();
        env.gain.setValueAtTime(0, at);
        env.gain.linearRampToValueAtTime(gain, at + 0.006);
        env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
        osc1.connect(env);
        osc2.connect(overtoneGain).connect(env);
        env.connect(out);
        osc1.start(at);
        osc1.stop(at + dur + 0.05);
        osc2.start(at);
        osc2.stop(at + dur + 0.05);
      },
    };
  }

  // A synthesized kick: a sine pitched down fast under a fast decay, the standard cheap way to
  // get a "thump" with no sample.
  function kickHit(t) {
    return {
      t,
      play(ctx, out, at) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, at);
        osc.frequency.exponentialRampToValueAtTime(45, at + 0.12);
        const env = ctx.createGain();
        env.gain.setValueAtTime(0.9, at);
        env.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
        osc.connect(env).connect(out);
        osc.start(at);
        osc.stop(at + 0.22);
      },
    };
  }

  // A short filtered burst from a shared noise buffer - reused for the snare/hat hits of one
  // playLofi() call rather than building a fresh buffer per hit, since dozens of these fire
  // every loop.
  function noiseHit(t, buffer, { duration, filterType, filterHz, gain }) {
    return {
      t,
      play(ctx, out, at) {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = filterType;
        filter.frequency.value = filterHz;
        const env = ctx.createGain();
        env.gain.setValueAtTime(gain, at);
        env.gain.exponentialRampToValueAtTime(0.0001, at + duration);
        source.connect(filter).connect(env).connect(out);
        source.start(at);
        source.stop(at + duration + 0.02);
      },
    };
  }

  // Sparse single-sample impulses rather than continuous hiss - loops as a quiet vinyl-crackle
  // bed under Lo-fi's chords and drums.
  function buildCrackleBuffer(ctx) {
    const seconds = 3;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() < 0.0006 ? Math.random() * 2 - 1 : 0;
    }
    return buffer;
  }

  // chords: an array of 4-note chords (Hz), each held for `chordDur` seconds, looping back to
  // the first chord after the last - this is what varies between the three Lo-fi tracks.
  function playLofi(ctx, out, { chords, chordDur }) {
    const loopSeconds = chordDur * chords.length;
    const hits = [];

    chords.forEach((freqs, i) => {
      const chordStart = i * chordDur;
      freqs.forEach((freq) => hits.push(pianoNoteHit(chordStart, freq, chordDur * 0.85, 0.045)));
    });

    // The drum bar repeats every chordDur seconds rather than once per full loop, so it stays
    // a steady pulse under however many chords the progression has.
    const noiseBuf = buildNoiseBuffer('white');
    const barCount = Math.round(loopSeconds / chordDur);
    for (let bar = 0; bar < barCount; bar++) {
      const base = bar * chordDur;
      const half = chordDur / 2;
      hits.push(kickHit(base));
      hits.push(kickHit(base + half));
      hits.push(noiseHit(base + half / 2, noiseBuf, { duration: 0.14, filterType: 'bandpass', filterHz: 2200, gain: 0.32 }));
      hits.push(noiseHit(base + half + half / 2, noiseBuf, { duration: 0.14, filterType: 'bandpass', filterHz: 2200, gain: 0.32 }));
      const hatStep = chordDur / 8;
      for (let e = 0; e < 8; e++) {
        hits.push(noiseHit(base + e * hatStep, noiseBuf, {
          duration: 0.045, filterType: 'highpass', filterHz: 7500, gain: e % 2 === 0 ? 0.11 : 0.06,
        }));
      }
    }

    const crackleSource = ctx.createBufferSource();
    crackleSource.buffer = buildCrackleBuffer(ctx);
    crackleSource.loop = true;
    const crackleFilter = ctx.createBiquadFilter();
    crackleFilter.type = 'highpass';
    crackleFilter.frequency.value = 3000;
    const crackleGain = ctx.createGain();
    crackleGain.gain.value = 0.5;
    crackleSource.connect(crackleFilter).connect(crackleGain).connect(out);
    crackleSource.start();

    const loop = scheduleLoop(ctx, out, { hits, loopSeconds });

    return {
      stop() {
        loop.stop();
        disconnectAll([crackleSource, crackleFilter, crackleGain]);
      },
    };
  }

  // Arpeggiated, not struck together: each chord's four notes play in sequence a beat apart and
  // ring well past the next note's onset, like a pedaled piano, plus a soft root note for body.
  function playClassical(ctx, out, { chords, chordDur }) {
    const loopSeconds = chordDur * chords.length;
    const hits = [];
    const noteStep = chordDur / 4;

    chords.forEach((freqs, i) => {
      const chordStart = i * chordDur;
      freqs.forEach((freq, j) => hits.push(pianoNoteHit(chordStart + j * noteStep, freq, chordDur * 0.8, 0.09)));
      hits.push(pianoNoteHit(chordStart, freqs[0] / 2, chordDur * 0.9, 0.06));
    });

    return scheduleLoop(ctx, out, { hits, loopSeconds });
  }

  // ii-V-I turnarounds and i-VI-III-VII loops in various keys - the kind of mellow, jazzy
  // progressions the genre leans on. Each entry is 4 chords of 4 notes (Hz) apiece.
  const LOFI_CHORDS = {
    rainy: [ // i-VI-III-VII, A minor (Am7-Fmaj7-Cmaj7-G7)
      [220.00, 261.63, 329.63, 392.00],
      [174.61, 220.00, 261.63, 329.63],
      [261.63, 329.63, 392.00, 493.88],
      [196.00, 246.94, 293.66, 349.23],
    ],
    latenight: [ // ii-V-I-vi, C major (Dm7-G7-Cmaj7-Am7)
      [146.83, 174.61, 220.00, 261.63],
      [196.00, 246.94, 293.66, 349.23],
      [261.63, 329.63, 392.00, 493.88],
      [220.00, 261.63, 329.63, 392.00],
    ],
    studybreak: [ // vi-ii-V-I, C major (Am7-Dm7-G7-Cmaj7), brighter/quicker
      [220.00, 261.63, 329.63, 392.00],
      [146.83, 174.61, 220.00, 261.63],
      [196.00, 246.94, 293.66, 349.23],
      [261.63, 329.63, 392.00, 493.88],
    ],
  };

  // I-V-vi-IV and its relative-minor cousins - the "four chords" pop/classical progression
  // family, transposed differently per track.
  const CLASSICAL_CHORDS = {
    moonlight: [ // I-V-vi-IV, C major
      [261.63, 329.63, 392.00, 523.25],
      [196.00, 246.94, 293.66, 392.00],
      [220.00, 261.63, 329.63, 440.00],
      [174.61, 220.00, 261.63, 349.23],
    ],
    reverie: [ // i-VI-III-VII, D minor - a wistful minor-key cousin
      [293.66, 349.23, 440.00, 587.33],
      [233.08, 293.66, 349.23, 440.00],
      [174.61, 220.00, 261.63, 349.23],
      [261.63, 329.63, 392.00, 493.88],
    ],
    sonata: [ // IV-I-V-vi, C major, brighter and quicker than the other two
      [174.61, 220.00, 261.63, 349.23],
      [261.63, 329.63, 392.00, 523.25],
      [196.00, 246.94, 293.66, 392.00],
      [220.00, 261.63, 329.63, 440.00],
    ],
  };

  const GENERATORS = {
    white: (ctx, out) => playLoopedNoise(ctx, out, 'white'),
    brown: (ctx, out) => playLoopedNoise(ctx, out, 'brown'),
    rain: (ctx, out) => playRain(ctx, out),
    ocean: (ctx, out) => playOcean(ctx, out),
    'ambient-warm': (ctx, out) => playAmbientDrone(ctx, out, { base: 130.81, ratios: [1, 1.5, 2], wave: 'sine', lfoRate: 0.05, filterHz: 900 }),
    'ambient-airy': (ctx, out) => playAmbientDrone(ctx, out, { base: 196.0, ratios: [1, 1.25, 2, 3], wave: 'triangle', lfoRate: 0.08, filterHz: 2200 }),
    'ambient-deep': (ctx, out) => playAmbientDrone(ctx, out, { base: 65.41, ratios: [1, 1.5], wave: 'sine', lfoRate: 0.03, filterHz: 500 }),
    'lofi-rainy': (ctx, out) => playLofi(ctx, out, { chords: LOFI_CHORDS.rainy, chordDur: 2 }),
    'lofi-latenight': (ctx, out) => playLofi(ctx, out, { chords: LOFI_CHORDS.latenight, chordDur: 2.5 }),
    'lofi-studybreak': (ctx, out) => playLofi(ctx, out, { chords: LOFI_CHORDS.studybreak, chordDur: 1.75 }),
    'classical-moonlight': (ctx, out) => playClassical(ctx, out, { chords: CLASSICAL_CHORDS.moonlight, chordDur: 2 }),
    'classical-reverie': (ctx, out) => playClassical(ctx, out, { chords: CLASSICAL_CHORDS.reverie, chordDur: 2.5 }),
    'classical-sonata': (ctx, out) => playClassical(ctx, out, { chords: CLASSICAL_CHORDS.sonata, chordDur: 1.5 }),
  };

  /* ---------- Pomodoro end-of-session cues ----------
     One-shot chimes, not loops, so they get their own gain nodes straight to ctx.destination
     instead of routing through masterGain/activeGenerator - that keeps them unaffected by (and
     non-disruptive to) whatever Focus Sounds track happens to be playing at the time. */
  function scheduleTone(ctx, { at, freq, dur, type, peakGain }) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(peakGain, at + 0.02);
    env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(env).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }

  // A soft ascending sine arpeggio (C5-E5-G5) with a slow decay - signals "study session done,
  // time to relax" without being jarring.
  function playCalmingChime(ctx) {
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      scheduleTone(ctx, { at: ctx.currentTime + i * 0.18, freq, dur: 1.1, type: 'sine', peakGain: 0.35 });
    });
  }

  // Three sharp, identical square-wave beeps - deliberately more urgent than the calming chime
  // to signal "break's over, back to work."
  function playAlarmChime(ctx) {
    for (let i = 0; i < 3; i++) {
      scheduleTone(ctx, { at: ctx.currentTime + i * 0.22, freq: 880, dur: 0.18, type: 'square', peakGain: 0.3 });
    }
  }

  const SESSION_CUES = { calm: playCalmingChime, alarm: playAlarmChime };

  async function playSessionCue(kind) {
    const factory = SESSION_CUES[kind];
    if (!factory) return;
    const ctx = getAudioCtx();
    await ctx.resume();
    factory(ctx);
  }

  function stopFile() {
    audio.pause();
  }

  function stopGenerated() {
    if (activeGenerator) {
      activeGenerator.stop();
      activeGenerator = null;
    }
    if (masterGain) {
      masterGain.disconnect();
      masterGain = null;
    }
  }

  function reportError(message) {
    chrome.runtime.sendMessage({ type: 'MUSIC_PLAYBACK_ERROR', payload: { message } });
  }

  async function playGenerated(type, volume) {
    stopFile();
    stopGenerated();
    const factory = GENERATORS[type];
    if (!factory) {
      // Only reachable if a generator name in background.js's MUSIC_LIBRARY doesn't have a
      // matching entry here - a real (if unlikely) risk given the two are hand-kept in sync,
      // so this reports it the same way a missing audio file does rather than throwing.
      reportError(`Unknown sound generator "${type}".`);
      return;
    }
    const ctx = getAudioCtx();
    await ctx.resume();
    masterGain = ctx.createGain();
    masterGain.gain.value = volume;
    masterGain.connect(ctx.destination);
    activeGenerator = factory(ctx, masterGain);
  }

  function playFile(src, volume) {
    stopGenerated();
    audio.src = src;
    audio.loop = true;
    audio.volume = volume;
    audio.play().catch((err) => reportError(err.message));
  }

  function pauseAll() {
    stopFile();
    stopGenerated();
  }

  function setVolume(volume) {
    currentVolume = volume;
    if (masterGain) masterGain.gain.value = volume;
    audio.volume = volume;
  }

  audio.addEventListener('error', () => {
    // Fires for a track whose file isn't bundled yet - see extension/audio's expected layout
    // in background/background.js's MUSIC_LIBRARY. Surfacing it lets the sidebar show a real
    // status instead of silence that looks like a bug.
    if (!audio.src) return;
    reportError('Could not load this track - the audio file may be missing.');
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.type) return undefined;

    switch (message.type) {
      case 'OFFSCREEN_MUSIC_PLAY': {
        const { kind, generator, src, volume } = message.payload || {};
        currentVolume = volume != null ? volume : currentVolume;
        if (kind === 'generated') playGenerated(generator, currentVolume);
        else if (kind === 'file' && src) playFile(src, currentVolume);
        sendResponse({ ok: true });
        return true;
      }
      case 'OFFSCREEN_MUSIC_PAUSE':
        pauseAll();
        sendResponse({ ok: true });
        return true;
      case 'OFFSCREEN_MUSIC_SET_VOLUME':
        setVolume((message.payload && message.payload.volume) != null ? message.payload.volume : currentVolume);
        sendResponse({ ok: true });
        return true;
      case 'OFFSCREEN_SESSION_CUE':
        playSessionCue(message.payload && message.payload.kind);
        sendResponse({ ok: true });
        return true;
      default:
        return undefined;
    }
  });
})();
