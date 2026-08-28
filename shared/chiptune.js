/*
 * DarkyPlay chiptune engine
 * -------------------------
 * Original background music generated live with WebAudio - no audio files,
 * nothing to download, nothing licensed from anyone.
 *
 * Usage - one line per game, at the end of <body>:
 *   <script src="../shared/chiptune.js" data-track="pacman"></script>
 *
 * It adds its own mute button, remembers the choice across every game on the
 * site (one localStorage key), and waits for the first tap/click/key before
 * making a sound, because mobile Safari and Chrome block audio until then.
 */
(function () {
    'use strict';

    var STORE_KEY = 'darkyplayMusicMuted';

    // ---------------------------------------------------------------
    // Notes
    // ---------------------------------------------------------------
    var SEMITONE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

    function noteFreq(name) {
        var m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
        if (!m) return 0;
        var s = SEMITONE[m[1]];
        if (m[2] === '#') s++;
        else if (m[2] === 'b') s--;
        var midi = (parseInt(m[3], 10) + 1) * 12 + s;
        return 440 * Math.pow(2, (midi - 69) / 12);
    }

    // "A4 . C5 ." -> ['A4', null, 'C5', null]
    function P(str) {
        return str.trim().split(/\s+/).map(function (t) {
            return t === '.' ? null : t;
        });
    }

    // ---------------------------------------------------------------
    // Tracks - each one is an eighth-note grid that loops.
    // lead / bass / drums may be different lengths; they just wrap.
    // drums: k = kick, s = snare, h = hat, o = open hat, . = rest
    // ---------------------------------------------------------------
    var TRACKS = {
        // Hub theme - the arcade's front door. Bright, welcoming, E minor
        // with a major lift in the second half so it does not feel gloomy.
        hub: {
            bpm: 124, lead: 'square', bassWave: 'triangle', gain: 0.14,
            melody: P(
                'E5 . B4 . E5 G5 . F#5 E5 . B4 . D5 . B4 . ' +
                'C5 . G5 . E5 . C5 . D5 . F#5 . A5 . G5 F#5'
            ),
            bass: P('E2 . E2 . B2 . B2 . C3 . C3 . D3 . D3 .'),
            drums: 'k . h . s . h k k . h . s . h o'
        },

        // Patient, climbing arpeggios in C# minor - it keeps rising, like the
        // tower, and stays out of the way of a game about timing a single tap.
        longtowers: {
            bpm: 116, lead: 'triangle', bassWave: 'sine', gain: 0.13,
            melody: P(
                'C#5 . E5 . G#5 . E5 . B4 . D#5 . F#5 . D#5 . ' +
                'A4 . C#5 . E5 . C#5 . B4 . D#5 . F#5 . G#5 .'
            ),
            bass: P('C#3 . . . G#2 . . . A2 . . . B2 . . .'),
            drums: 'k . . h s . . . k . . h s . h .'
        },

        // Arena funk in E minor - a bouncing, on-the-beat groove that sounds
        // like a pre-game hype loop without ever getting busy.
        hoopstack: {
            bpm: 128, lead: 'square', bassWave: 'sawtooth', gain: 0.13,
            melody: P(
                'E5 . E5 G5 . D5 . B4 . E5 . G5 A5 . G5 E5 ' +
                'D5 . D5 F#5 . A5 . F#5 E5 . B4 . D5 . E5 .'
            ),
            bass: P('E2 E2 . E2 D2 . D2 . C3 C3 . C3 B2 . B2 .'),
            drums: 'k h s h k h s o k h s h k k s h'
        },

        // Cool, unhurried thinking music in A minor - a duel across a board,
        // not a chase. Sparse enough to leave room for the player's own pace.
        picpacpoe: {
            bpm: 100, lead: 'square', bassWave: 'triangle', gain: 0.11,
            melody: P(
                'A4 . . E5 . . C5 . B4 . . D5 . . A4 . ' +
                'G4 . . D5 . . B4 . E4 . . A4 . . . .'
            ),
            bass: P('A2 . . . F2 . . . G2 . . . E2 . . .'),
            drums: 'k . . h . . s . k . . h . . h .'
        },

        // Calm, methodical D minor - a puzzle you think through rather than
        // react to, so the loop stays out of the way and never hurries you.
        g4096: {
            bpm: 92, lead: 'triangle', bassWave: 'sine', gain: 0.11,
            melody: P(
                'D5 . . A4 . . F5 . E5 . . C5 . . A4 . ' +
                'Bb4 . . F4 . . D5 . A4 . . D5 . . . .'
            ),
            bass: P('D3 . . . Bb2 . . . F2 . . . A2 . . .'),
            drums: 'k . . . s . . h . . h . s . . .'
        },

        // Bouncy arcade chase, A minor
        pacman: {
            bpm: 138, lead: 'square', bassWave: 'triangle', gain: 0.16,
            melody: P(
                'A4 . C5 E5 . C5 A4 . B4 . D5 F5 . D5 B4 . ' +
                'C5 . E5 G5 . E5 C5 . B4 A4 G4 A4 B4 . E4 .'
            ),
            bass: P('A2 . A2 . E2 . E2 . F2 . F2 . E2 . E2 .'),
            drums: 'k . h . s . h . k . h k s . h .'
        },

        // Driving, tense, D minor
        shooter: {
            bpm: 150, lead: 'sawtooth', bassWave: 'square', gain: 0.13,
            melody: P(
                'D5 . D5 F5 . E5 . D5 A4 . A4 C5 . D5 . . ' +
                'F5 . E5 D5 . C5 . A4 D5 . F5 A5 . G5 F5 E5'
            ),
            bass: P('D2 D2 . D2 A2 . A2 . Bb2 Bb2 . Bb2 A2 . A2 .'),
            drums: 'k h s h k h s h k h s h k k s o'
        },

        // Calm and simple, C major
        snake: {
            bpm: 108, lead: 'triangle', bassWave: 'sine', gain: 0.15,
            melody: P(
                'C5 . E5 . G5 . E5 . F5 . D5 . C5 . . . ' +
                'A4 . C5 . E5 . C5 . D5 . B4 . C5 . . .'
            ),
            bass: P('C3 . . . G2 . . . F2 . . . G2 . . .'),
            drums: 'k . . h s . . h k . . h s . h .'
        },

        // Upbeat and sunny, G major
        pikachu: {
            bpm: 144, lead: 'square', bassWave: 'triangle', gain: 0.15,
            melody: P(
                'G4 B4 D5 G5 . D5 B4 . A4 C5 E5 A5 . E5 C5 . ' +
                'B4 D5 G5 B5 . G5 D5 . E5 D5 C5 B4 A4 . G4 .'
            ),
            bass: P('G2 . G2 . C3 . C3 . D3 . D3 . G2 . D3 .'),
            drums: 'k . h . s . h k k . h . s . o .'
        },

        // Funky cruise, E minor
        spyro: {
            bpm: 126, lead: 'sawtooth', bassWave: 'square', gain: 0.13,
            melody: P(
                'E4 . G4 A4 . B4 . A4 G4 . E4 . D4 . E4 . ' +
                'B4 . D5 E5 . D5 B4 . A4 G4 . A4 B4 . . .'
            ),
            bass: P('E2 . E2 G2 A2 . A2 . B2 . B2 A2 G2 . E2 .'),
            drums: 'k . h k s . h . k h . k s . h o'
        },

        // Light and playful, F major
        holepringo: {
            bpm: 120, lead: 'triangle', bassWave: 'sine', gain: 0.15,
            melody: P(
                'F4 A4 C5 . A4 . F4 . G4 Bb4 D5 . Bb4 . G4 . ' +
                'A4 C5 F5 . C5 . A4 . G4 F4 E4 F4 . . . .'
            ),
            bass: P('F2 . . . Bb2 . . . C3 . . . F2 . . .'),
            drums: 'k . h . s . h . k . h . s . h h'
        },

        // Calm thinking music, C major - quiet so it never fights the quiz
        iqur: {
            bpm: 96, lead: 'sine', bassWave: 'sine', gain: 0.1,
            melody: P(
                'E5 . . C5 . . G4 . A4 . . C5 . . . . ' +
                'D5 . . B4 . . G4 . C5 . . . . . . .'
            ),
            bass: P('C3 . . . . . . . F2 . . . G2 . . .'),
            drums: '. . h . . . h . . . h . . . h .'
        },

        // Gentle puzzle mood, A major
        wordcatch: {
            bpm: 104, lead: 'triangle', bassWave: 'sine', gain: 0.12,
            melody: P(
                'A4 . C#5 . E5 . C#5 . D5 . B4 . A4 . . . ' +
                'E5 . D5 . C#5 . B4 . A4 . B4 . C#5 . . .'
            ),
            bass: P('A2 . . . E3 . . . D3 . . . E3 . . .'),
            drums: 'k . . h . . s . k . . h . . h .'
        },

        // Night-time chase, B minor
        primeescape: {
            bpm: 140, lead: 'square', bassWave: 'sawtooth', gain: 0.13,
            melody: P(
                'B4 . D5 . F#5 . D5 B4 A4 . C#5 . E5 . C#5 A4 ' +
                'G4 . B4 . D5 . B4 G4 F#4 . A4 B4 . . . .'
            ),
            bass: P('B2 B2 . B2 G2 . G2 . A2 A2 . A2 F#2 . F#2 .'),
            drums: 'k h s h k h s h k h s h k k s h'
        },

        // Cheerful sky, C major
        happybird: {
            bpm: 130, lead: 'square', bassWave: 'triangle', gain: 0.14,
            melody: P(
                'G4 . C5 . E5 . C5 . D5 . B4 . G4 . . . ' +
                'A4 . D5 . F5 . D5 . E5 . C5 . G4 . . .'
            ),
            bass: P('C3 . C3 . G2 . G2 . A2 . A2 . F2 . G2 .'),
            drums: 'k . h . s . h . k . h k s . h .'
        }
    };

    // ---------------------------------------------------------------
    // Audio graph
    // ---------------------------------------------------------------
    var ctx = null, master = null, noiseBuf = null;
    var track = null, stepIdx = 0, nextNoteTime = 0, timer = null;
    var playing = false, unlocked = false;
    var muted = false;

    try { muted = localStorage.getItem(STORE_KEY) === '1'; } catch (e) { }

    function makeCtx() {
        if (ctx) return ctx;
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0;
        // a touch of low-pass keeps the square waves from sounding harsh
        var tone = ctx.createBiquadFilter();
        tone.type = 'lowpass';
        tone.frequency.value = 5200;
        master.connect(tone).connect(ctx.destination);

        var len = Math.floor(ctx.sampleRate * 0.4);
        noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
        var d = noiseBuf.getChannelData(0);
        for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        return ctx;
    }

    function tone(t, freq, dur, type, gain) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(gain, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(master);
        o.start(t);
        o.stop(t + dur + 0.03);
    }

    function kick(t) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(150, t);
        o.frequency.exponentialRampToValueAtTime(45, t + 0.11);
        g.gain.setValueAtTime(0.5, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
        o.connect(g).connect(master);
        o.start(t);
        o.stop(t + 0.2);
    }

    function noise(t, dur, hz, gain, type) {
        var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        s.buffer = noiseBuf;
        f.type = type;
        f.frequency.value = hz;
        g.gain.setValueAtTime(gain, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        s.connect(f).connect(g).connect(master);
        s.start(t);
        s.stop(t + dur + 0.02);
    }

    var snare = function (t) { noise(t, 0.14, 1800, 0.28, 'bandpass'); };
    var hat = function (t, open) { noise(t, open ? 0.14 : 0.035, 8000, 0.14, 'highpass'); };

    function scheduleStep(i, t) {
        var stepDur = 30 / track.bpm; // one eighth note

        var n = track.melody[i % track.melody.length];
        if (n) tone(t, noteFreq(n), stepDur * 0.9, track.lead, 0.22);

        var b = track.bass[i % track.bass.length];
        if (b) tone(t, noteFreq(b), stepDur * 1.6, track.bassWave, 0.3);

        var d = track.drums.split(/\s+/);
        var hit = d[i % d.length];
        if (hit === 'k') kick(t);
        else if (hit === 's') snare(t);
        else if (hit === 'h') hat(t, false);
        else if (hit === 'o') hat(t, true);
    }

    function scheduler() {
        if (!playing || !ctx) return;
        var stepDur = 30 / track.bpm;
        while (nextNoteTime < ctx.currentTime + 0.15) {
            scheduleStep(stepIdx, nextNoteTime);
            nextNoteTime += stepDur;
            stepIdx++;
        }
    }

    function applyVolume() {
        if (!ctx) return;
        var target = muted ? 0 : (track ? track.gain : 0.14);
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setTargetAtTime(target, ctx.currentTime, 0.12);
    }

    function start() {
        if (playing || !track) return;
        if (!makeCtx()) return;
        // Never schedule against a suspended clock - currentTime is frozen
        // there, so every note would land in the past once it resumes.
        if (ctx.state !== 'running') {
            try {
                var r = ctx.resume();
                if (r && r.then) r.then(function () { start(); }, function () { });
            } catch (e) { }
            return;
        }
        playing = true;
        if (!muted) startSilentLoop(); // also re-arms it after returning from background
        stepIdx = 0;
        nextNoteTime = ctx.currentTime + 0.08;
        applyVolume();
        timer = setInterval(scheduler, 25);
        scheduler();
    }

    function stop() {
        playing = false;
        if (timer) { clearInterval(timer); timer = null; }
        if (ctx) master.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
        stopSilentLoop();
    }

    function setMuted(v) {
        muted = !!v;
        try { localStorage.setItem(STORE_KEY, muted ? '1' : '0'); } catch (e) { }
        applyVolume();
        paintButton();
        // setMuted always runs from the button tap, so this is inside a
        // gesture and iOS will let the media element start again.
        if (muted) stopSilentLoop();
        else if (unlocked) startSilentLoop();
    }

    // ---------------------------------------------------------------
    // Mute button - bottom-left, the one corner no game already uses
    // ---------------------------------------------------------------
    var btn = null;

    function paintButton() {
        if (btn) btn.textContent = muted ? '🔇' : '🎵';
    }

    function makeButton() {
        btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Music on/off');
        btn.style.cssText = [
            'position:fixed', 'left:12px', 'bottom:12px', 'z-index:2147483000',
            'width:42px', 'height:42px', 'border-radius:50%', 'border:none',
            'background:rgba(255,255,255,0.55)', 'color:#123', 'font-size:18px',
            'line-height:1', 'padding:0', 'cursor:pointer',
            'box-shadow:0 3px 10px rgba(0,0,0,0.25)',
            '-webkit-tap-highlight-color:transparent', 'touch-action:manipulation'
        ].join(';');
        paintButton();

        function toggle(e) {
            e.preventDefault();
            e.stopPropagation();
            setMuted(!muted);
            // go through the full unlock path - this tap is itself a gesture,
            // and may be the one that finally gets iOS to open the context
            if (!muted) unlock();
        }
        btn.addEventListener('click', toggle);
        btn.addEventListener('touchstart', toggle, { passive: false });

        document.body.appendChild(btn);
    }

    // ---------------------------------------------------------------
    // Boot - mobile browsers refuse to make noise before a gesture
    // ---------------------------------------------------------------
    // iOS is fussiest on touchend; keep the others as fallbacks.
    var UNLOCK_EVENTS = ['touchend', 'touchstart', 'pointerup', 'pointerdown',
        'mousedown', 'click', 'keydown'];

    function dropUnlockListeners() {
        UNLOCK_EVENTS.forEach(function (evt) {
            window.removeEventListener(evt, unlock, true);
        });
    }

    // A one-sample silent buffer played inside the gesture. iOS will not
    // consider a context usable until it has actually rendered something.
    function primeSilence() {
        try {
            var s = ctx.createBufferSource();
            s.buffer = ctx.createBuffer(1, 1, 22050);
            s.connect(ctx.destination);
            s.start(0);
        } catch (e) { }
    }

    // On iOS the hardware ringer switch silences WebAudio, but NOT media
    // played through an <audio> element. Looping a silent clip alongside it
    // moves the page into the media session, so the music survives the switch.
    var silentEl = null;

    function silentWavUrl() {
        var rate = 8000, n = rate; // one second
        var buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
        function str(o, s) { for (var i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); }
        str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE');
        str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
        v.setUint16(22, 1, true); v.setUint32(24, rate, true);
        v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
        str(36, 'data'); v.setUint32(40, n * 2, true);
        var bytes = new Uint8Array(buf), bin = '';
        for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        return 'data:audio/wav;base64,' + btoa(bin);
    }

    function startSilentLoop() {
        try {
            if (!silentEl) {
                silentEl = document.createElement('audio');
                silentEl.setAttribute('playsinline', '');
                silentEl.setAttribute('webkit-playsinline', '');
                silentEl.loop = true;
                silentEl.volume = 0.001; // some browsers skip media at exactly 0
                silentEl.src = silentWavUrl();
                silentEl.style.display = 'none';
                document.body.appendChild(silentEl);
            }
            var p = silentEl.play();
            if (p && p.catch) p.catch(function () { });
        } catch (e) { }
    }

    // Holding the media session pauses whatever the listener had playing, so
    // let go of it whenever our own music is not actually sounding.
    function stopSilentLoop() {
        try { if (silentEl) silentEl.pause(); } catch (e) { }
    }

    // Called on every gesture until the context is genuinely running. The old
    // version dropped the listeners on the FIRST gesture regardless of whether
    // resume() had actually taken effect - and since resume() is async, on iOS
    // it usually had not, which left the page silent with no way to retry.
    function unlock() {
        if (!makeCtx()) { dropUnlockListeners(); return; }

        primeSilence();
        if (!muted) startSilentLoop();

        function settle() {
            if (ctx.state !== 'running') return; // leave listeners armed, retry next gesture
            unlocked = true;
            dropUnlockListeners();
            if (!muted && !playing) start();
        }

        try {
            var r = ctx.resume();
            if (r && r.then) r.then(settle, function () { });
        } catch (e) { }
        settle();
    }

    // document.currentScript is only valid while this script is executing,
    // so read the track name now and finish once <body> exists.
    var tag = document.currentScript ||
        document.querySelector('script[src*="chiptune.js"]');
    track = TRACKS[tag && tag.getAttribute('data-track')] || TRACKS.pacman;

    function boot() {
        makeButton();

        UNLOCK_EVENTS.forEach(function (evt) {
            window.addEventListener(evt, unlock, true);
        });

        // stop when the tab goes away so it never plays behind another app
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) stop();
            else if (unlocked && !muted) start();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    window.DarkyMusic = {
        start: start,
        stop: stop,
        toggle: function () { setMuted(!muted); },
        setMuted: setMuted,
        isMuted: function () { return muted; },
        isPlaying: function () { return playing; },
        tracks: Object.keys(TRACKS),
        // handy when diagnosing a phone that stays silent
        state: function () {
            return {
                ctx: ctx ? ctx.state : 'none',
                unlocked: unlocked,
                playing: playing,
                muted: muted,
                silentLoop: !!silentEl && !silentEl.paused
            };
        }
    };
})();
