/*
 * DarkyPlay leaderboard
 * -------------------
 * Keeps a top-10 per game under one player name shared by every game on the
 * site.
 *
 * Two modes, decided by the REMOTE constant below:
 *   REMOTE empty  - boards are per-device; everyone on the same phone or
 *                   computer competes on one list
 *   REMOTE set    - boards are worldwide, backed by a Firebase Realtime
 *                   Database over plain REST, with the device list kept as
 *                   a mirror so an offline player still sees something
 *
 * Usage - one line per game, at the end of <body>:
 *   <script src="../shared/scores.js" data-game="long-towers"></script>
 *
 * Then, wherever the game ends:
 *   DarkyScores.submit('long-towers', score);
 */
(function () {
    'use strict';

    // ---------------------------------------------------------------
    // GLOBAL LEADERBOARD
    // ---------------------------------------------------------------
    // Paste your Firebase Realtime Database URL here and every board on the
    // site becomes worldwide. Leave it empty and the site falls back to the
    // per-device boards, which is also what happens whenever the network is
    // down, so the games never break because of this.
    //
    //   var REMOTE = 'https://darkyplay-xxxx-default-rtdb.firebaseio.com';
    //
    // Setup is four steps, all free, in the Firebase console:
    //   1. Create a project
    //   2. Build -> Realtime Database -> Create Database
    //   3. Paste the rules from shared/firebase-rules.json into the Rules tab
    //   4. Copy the database URL shown at the top of the Data tab into REMOTE
    var REMOTE = '';

    var NAME_KEY = 'darkyplayName';
    var DATA_KEY = 'darkyplayScores';
    var MAX_ROWS = 10;
    var MAX_NAME = 12;
    var FETCH_TIMEOUT = 6000;

    // Highest believable score per game. A global board is writable by anyone,
    // so this at least keeps the obvious garbage off the top of the list.
    var SANE_MAX = {
        'neon-pacman': 100000, 'fired-space-shooter': 500000, 'snake': 5000,
        'pikachu-breakout': 100000, 'spyro-taxi': 100000, 'holepringo': 100000,
        'iqur': 300, 'wordsearch': 50000, 'stratosfer-merge': 1000000,
        'prime-escape': 100000, 'happy-bird': 2000, 'long-towers': 2000,
        'nba-stack': 2000
    };

    var GAMES = {
        'neon-pacman': 'Neon Pacman',
        'fired-space-shooter': 'Fired Space Shooter',
        'snake': 'Pro Snake',
        'pikachu-breakout': 'Pikachu Breakout',
        'spyro-taxi': 'Spyro Taxi',
        'holepringo': 'Holepringo',
        'iqur': 'IQur',
        'wordsearch': 'Word Catch',
        'stratosfer-merge': 'Stratosfer Merge',
        'prime-escape': 'Prime Escape',
        'happy-bird': 'Happy Bird',
        'long-towers': 'Long Towers',
        'nba-stack': 'Hoop Stack'
    };

    // What one point means, so the board does not just say "score" everywhere
    var UNITS = {
        'iqur': 'IQ',
        'long-towers': 'floors',
        'nba-stack': 'high',
        'prime-escape': 'coins',
        'snake': 'length',
        'wordsearch': 'points'
    };

    var currentGame = null;

    // ---------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------
    function readAll() {
        try {
            var raw = localStorage.getItem(DATA_KEY);
            var o = raw ? JSON.parse(raw) : {};
            return (o && typeof o === 'object') ? o : {};
        } catch (e) { return {}; }
    }

    function writeAll(o) {
        try { localStorage.setItem(DATA_KEY, JSON.stringify(o)); } catch (e) { }
    }

    function getName() {
        try { return localStorage.getItem(NAME_KEY) || ''; } catch (e) { return ''; }
    }

    // A public board means these names are shown to strangers, including
    // children. Not a real moderation system - just the obvious stuff.
    var BANNED = [
        'amk', 'aq', 'oc', 'orospu', 'piç', 'pic', 'sik', 'sok', 'yarrak',
        'gavat', 'gotveren', 'göt', 'got', 'ibne', 'pezevenk', 'siktir',
        'fuck', 'shit', 'cunt', 'bitch', 'dick', 'nigg', 'rape', 'porn',
        'hitler', 'nazi'
    ];

    function looksBanned(s) {
        // fold leetspeak and spacing so "s1k" and "s i k" are caught too
        var f = String(s || '').toLowerCase()
            .replace(/[0@]/g, 'o').replace(/[1!|]/g, 'i').replace(/3/g, 'e')
            .replace(/4/g, 'a').replace(/5\$/g, 's').replace(/7/g, 't')
            .replace(/[^a-zçğıöşü]/g, '');
        for (var i = 0; i < BANNED.length; i++) {
            if (f.indexOf(BANNED[i].replace(/[^a-zçğıöşü]/g, '')) !== -1) return true;
        }
        return false;
    }

    function cleanName(s) {
        return String(s || '')
            .replace(/[<>]/g, '')     // never let markup into a name
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, MAX_NAME);
    }

    function setName(n) {
        n = cleanName(n);
        try { localStorage.setItem(NAME_KEY, n); } catch (e) { }
        return n;
    }

    function top(gameId, n) {
        var rows = readAll()[gameId] || [];
        return rows.slice(0, n || MAX_ROWS);
    }

    // Where would this score land? 1-based, or 0 if it misses the board.
    function rankFor(gameId, score) {
        var rows = readAll()[gameId] || [];
        var i = 0;
        while (i < rows.length && rows[i].s >= score) i++;
        return (i < MAX_ROWS) ? i + 1 : 0;
    }

    // ---------------------------------------------------------------
    // Remote (Firebase Realtime Database over plain REST - no SDK, no CDN)
    // ---------------------------------------------------------------
    var isGlobal = function () { return !!REMOTE; };

    function withTimeout(promise, ms) {
        return new Promise(function (resolve, reject) {
            var done = false;
            var t = setTimeout(function () {
                if (!done) { done = true; reject(new Error('timeout')); }
            }, ms);
            promise.then(function (v) {
                if (!done) { done = true; clearTimeout(t); resolve(v); }
            }, function (e) {
                if (!done) { done = true; clearTimeout(t); reject(e); }
            });
        });
    }

    function remoteTop(gameId) {
        var url = REMOTE.replace(/\/+$/, '') + '/scores/' + encodeURIComponent(gameId)
            + '.json?orderBy=%22s%22&limitToLast=' + MAX_ROWS;
        return withTimeout(fetch(url, { cache: 'no-store' }), FETCH_TIMEOUT)
            .then(function (r) {
                if (!r.ok) throw new Error('http ' + r.status);
                return r.json();
            })
            .then(function (obj) {
                var out = [];
                if (obj && typeof obj === 'object') {
                    Object.keys(obj).forEach(function (k) {
                        var v = obj[k];
                        if (v && typeof v.s === 'number') {
                            out.push({ n: String(v.n || 'Player').slice(0, MAX_NAME), s: v.s, t: v.t || 0 });
                        }
                    });
                }
                out.sort(function (a, b) { return (b.s - a.s) || (a.t - b.t); });
                return out.slice(0, MAX_ROWS);
            });
    }

    function remoteSubmit(gameId, score, name) {
        var url = REMOTE.replace(/\/+$/, '') + '/scores/' + encodeURIComponent(gameId) + '.json';
        return withTimeout(fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ n: name, s: score, t: { '.sv': 'timestamp' } })
        }), FETCH_TIMEOUT).then(function (r) {
            if (!r.ok) throw new Error('http ' + r.status);
            return true;
        });
    }

    function record(gameId, score, name) {
        var all = readAll();
        var rows = all[gameId] || [];
        var entry = { n: name, s: score, t: Date.now() };
        rows.push(entry);
        // highest first; older entry wins a tie, so a record has to be beaten
        rows.sort(function (a, b) { return (b.s - a.s) || (a.t - b.t); });
        rows = rows.slice(0, MAX_ROWS);
        all[gameId] = rows;
        writeAll(all);
        return rows.indexOf(entry) + 1; // 0 if it fell off the end
    }

    // ---------------------------------------------------------------
    // Styles
    // ---------------------------------------------------------------
    function injectStyles() {
        if (document.getElementById('darky-scores-css')) return;
        var css = ''
            + '.dsc-overlay{position:fixed;inset:0;z-index:2147483100;display:none;'
            + 'align-items:center;justify-content:center;padding:20px;'
            + 'background:rgba(4,8,20,.72);font-family:Inter,Arial,Helvetica,sans-serif;}'
            + '.dsc-overlay.on{display:flex;}'
            + '.dsc-panel{width:min(92vw,380px);max-height:86vh;overflow:auto;'
            + 'background:#131a35;border:2px solid rgba(0,240,255,.3);border-radius:22px;'
            + 'padding:20px 18px;color:#eaf4ff;text-align:center;'
            + 'box-shadow:0 20px 60px rgba(0,0,0,.55);}'
            + '.dsc-title{font-size:13px;font-weight:800;letter-spacing:2px;'
            + 'text-transform:uppercase;color:#7fe9ff;opacity:.85;margin-bottom:2px;}'
            + '.dsc-h{font-size:23px;font-weight:900;margin-bottom:14px;}'
            + '.dsc-list{list-style:none;margin:0 0 14px;padding:0;text-align:left;}'
            + '.dsc-row{display:flex;align-items:center;gap:10px;padding:9px 11px;'
            + 'border-radius:11px;font-size:15px;background:rgba(255,255,255,.04);'
            + 'margin-bottom:6px;}'
            + '.dsc-row.me{background:rgba(29,233,182,.16);'
            + 'box-shadow:inset 0 0 0 1px rgba(29,233,182,.5);}'
            + '.dsc-pos{width:26px;font-weight:900;opacity:.6;flex:none;}'
            + '.dsc-row.p1 .dsc-pos,.dsc-row.p2 .dsc-pos,.dsc-row.p3 .dsc-pos{opacity:1;}'
            + '.dsc-row.p1 .dsc-pos{color:#ffd93b;}'
            + '.dsc-row.p2 .dsc-pos{color:#cfd8e3;}'
            + '.dsc-row.p3 .dsc-pos{color:#e0a06a;}'
            + '.dsc-nm{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600;}'
            + '.dsc-sc{font-weight:900;color:#1de9b6;flex:none;}'
            + '.dsc-empty{opacity:.55;font-size:14px;padding:18px 0;}'
            + '.dsc-foot{display:flex;gap:9px;}'
            + '.dsc-btn{flex:1;border:none;border-radius:13px;padding:12px;font-size:14px;'
            + 'font-weight:800;font-family:inherit;cursor:pointer;min-height:44px;'
            + '-webkit-tap-highlight-color:transparent;}'
            + '.dsc-btn.primary{background:linear-gradient(135deg,#1de9b6,#00b8d4);color:#04202a;}'
            + '.dsc-btn.ghost{background:rgba(255,255,255,.09);color:#cfe6f5;}'
            + '.dsc-input{width:100%;border-radius:13px;border:1px solid rgba(255,255,255,.18);'
            + 'background:rgba(255,255,255,.07);color:#fff;padding:13px;font-size:17px;'
            + 'font-family:inherit;text-align:center;margin-bottom:14px;}'
            + '.dsc-input:focus{outline:2px solid rgba(29,233,182,.6);}'
            + '.dsc-open{position:fixed;left:62px;bottom:12px;z-index:2147483000;'
            + 'width:42px;height:42px;border-radius:50%;border:none;padding:0;'
            + 'background:rgba(255,255,255,.55);color:#123;font-size:18px;line-height:1;'
            + 'cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,.25);'
            + '-webkit-tap-highlight-color:transparent;touch-action:manipulation;}'
            // hub listing
            + '.dsh-list{display:flex;flex-direction:column;gap:10px;}'
            + '.dsh-row{display:flex;align-items:center;gap:10px;width:100%;'
            + 'background:#181818;border:2px solid rgba(0,243,255,.35);border-radius:10px;'
            + 'padding:14px 13px;color:#dff6ff;font-family:inherit;font-size:.62rem;'
            + 'line-height:1.6;cursor:pointer;text-align:left;'
            + '-webkit-tap-highlight-color:transparent;}'
            + '.dsh-row:hover{border-color:#00f3ff;box-shadow:0 0 14px rgba(0,243,255,.35);}'
            + '.dsh-game{flex:1;color:#00f3ff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}'
            + '.dsh-who{opacity:.75;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:32%;}'
            + '.dsh-val{color:#ffee00;flex:none;}'
            + '.dsh-empty{opacity:.6;font-size:.6rem;line-height:1.8;}';
        var el = document.createElement('style');
        el.id = 'darky-scores-css';
        el.textContent = css;
        document.head.appendChild(el);
    }

    // ---------------------------------------------------------------
    // Overlay
    // ---------------------------------------------------------------
    var overlay = null, panel = null;

    function ensureOverlay() {
        if (overlay) return;
        injectStyles();
        overlay = document.createElement('div');
        overlay.className = 'dsc-overlay';
        panel = document.createElement('div');
        panel.className = 'dsc-panel';
        overlay.appendChild(panel);
        // tapping the backdrop closes, tapping the panel must not
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) close();
        });
        panel.addEventListener('click', function (e) { e.stopPropagation(); });
        document.body.appendChild(overlay);
    }

    function close() {
        if (overlay) overlay.classList.remove('on');
    }

    function el(tag, cls, text) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text != null) n.textContent = text; // textContent, never innerHTML
        return n;
    }

    function paintRows(host, gameId, rows, highlightIndex) {
        if (!rows.length) {
            host.appendChild(el('div', 'dsc-empty', 'No scores yet. Be the first!'));
            return;
        }
        var unit = UNITS[gameId] || '';
        var me = getName();
        var list = el('ul', 'dsc-list');
        rows.forEach(function (r, i) {
            // on a worldwide board, mark every row this player owns
            var mine = (i === highlightIndex) || (isGlobal() && me && r.n === me);
            var li = el('li', 'dsc-row p' + (i + 1) + (mine ? ' me' : ''));
            li.appendChild(el('span', 'dsc-pos', (i + 1) + '.'));
            li.appendChild(el('span', 'dsc-nm', r.n || 'Player'));
            li.appendChild(el('span', 'dsc-sc', unit ? (r.s + ' ' + unit) : String(r.s)));
            list.appendChild(li);
        });
        host.appendChild(list);
    }

    function showBoard(gameId, highlightIndex) {
        ensureOverlay();
        panel.innerHTML = '';

        var title = el('div', 'dsc-title', isGlobal() ? 'Worldwide' : 'Best on this device');
        panel.appendChild(title);
        panel.appendChild(el('div', 'dsc-h', GAMES[gameId] || gameId));

        var body = el('div');
        panel.appendChild(body);

        if (isGlobal()) {
            body.appendChild(el('div', 'dsc-empty', 'Loading the world board…'));
            remoteTop(gameId).then(function (rows) {
                body.innerHTML = '';
                paintRows(body, gameId, rows, -1);
            }, function () {
                // offline or the database is unreachable - never leave the
                // player staring at a spinner, show what this device knows
                body.innerHTML = '';
                title.textContent = 'Offline · best on this device';
                paintRows(body, gameId, top(gameId, MAX_ROWS), highlightIndex);
            });
        } else {
            paintRows(body, gameId, top(gameId, MAX_ROWS), highlightIndex);
        }

        var foot = el('div', 'dsc-foot');
        var rename = el('button', 'dsc-btn ghost', getName() ? 'Change name' : 'Set name');
        rename.type = 'button';
        rename.addEventListener('click', function () { askName(gameId, null, null); });
        var done = el('button', 'dsc-btn primary', 'Close');
        done.type = 'button';
        done.addEventListener('click', close);
        foot.appendChild(rename);
        foot.appendChild(done);
        panel.appendChild(foot);

        overlay.classList.add('on');
    }

    // Ask for a name. If pendingScore is given, the score is recorded with it.
    function askName(gameId, pendingScore, onDone) {
        ensureOverlay();
        panel.innerHTML = '';

        panel.appendChild(el('div', 'dsc-title', 'Leaderboard'));
        panel.appendChild(el('div', 'dsc-h', 'Who is playing?'));
        if (isGlobal()) {
            panel.appendChild(el('div', 'dsc-empty',
                'This name is shown to everyone playing Darky Play.'));
        }

        var input = document.createElement('input');
        input.className = 'dsc-input';
        input.type = 'text';
        input.maxLength = MAX_NAME;
        input.placeholder = 'Your name';
        input.value = getName();
        input.setAttribute('autocomplete', 'off');
        input.setAttribute('autocorrect', 'off');
        panel.appendChild(input);

        var warn = el('div', 'dsc-empty', '');
        warn.style.color = '#ff8a8a';
        warn.style.display = 'none';
        panel.appendChild(warn);

        function save() {
            var typed = cleanName(input.value);
            if (typed && looksBanned(typed)) {
                warn.textContent = 'Please pick a different name.';
                warn.style.display = 'block';
                return;
            }
            var n = setName(typed) || 'Player';
            if (pendingScore != null) {
                var pos = record(gameId, pendingScore, n);
                if (isGlobal()) remoteSubmit(gameId, pendingScore, n).catch(function () { });
                showBoard(gameId, pos ? pos - 1 : -1);
            } else {
                showBoard(gameId, -1);
            }
            if (onDone) onDone(n);
        }

        var foot = el('div', 'dsc-foot');
        var ok = el('button', 'dsc-btn primary', 'Save');
        ok.type = 'button';
        ok.addEventListener('click', save);
        foot.appendChild(ok);
        panel.appendChild(foot);

        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); save(); }
        });

        overlay.classList.add('on');
        setTimeout(function () { try { input.focus(); } catch (e) { } }, 50);
    }

    // ---------------------------------------------------------------
    // Public
    // ---------------------------------------------------------------
    function submit(gameId, score) {
        score = Math.max(0, Math.floor(Number(score) || 0));
        if (!gameId || score <= 0) return 0;
        if (score > (SANE_MAX[gameId] || Infinity)) return 0;

        // On a worldwide board every run is worth sending - it might place
        // globally even when it cannot beat this device's own top ten.
        var wouldRank = rankFor(gameId, score);
        if (!wouldRank && !isGlobal()) return 0;   // stay quiet on a local miss

        var name = getName();

        // Let the game's own "game over" panel land first - otherwise the
        // board covers the final score before the player has read it.
        if (!name) {
            setTimeout(function () { askName(gameId, score, null); }, 900);
            return wouldRank;
        }

        var pos = record(gameId, score, name);   // local copy always, even offline
        if (isGlobal()) remoteSubmit(gameId, score, name).catch(function () { });
        setTimeout(function () { showBoard(gameId, pos ? pos - 1 : -1); }, 900);
        return pos;
    }

    function makeButton(gameId) {
        injectStyles();
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'dsc-open';
        b.setAttribute('aria-label', 'Leaderboard');
        b.textContent = '🏆';
        function openIt(e) {
            e.preventDefault();
            e.stopPropagation();
            showBoard(gameId, -1);
        }
        b.addEventListener('click', openIt);
        b.addEventListener('touchstart', openIt, { passive: false });
        document.body.appendChild(b);
    }

    // Hub listing: one row per game that has a score, best first.
    function paintHubRows(host, rows) {
        if (!rows.length) {
            host.appendChild(el('div', 'dsh-empty',
                'No records yet - play a game and set the first one.'));
            return;
        }
        var list = el('div', 'dsh-list');
        rows.forEach(function (r) {
            var unit = UNITS[r.id] || '';
            var row = el('button', 'dsh-row');
            row.type = 'button';
            row.appendChild(el('span', 'dsh-game', GAMES[r.id]));
            row.appendChild(el('span', 'dsh-who', r.best.n || 'Player'));
            row.appendChild(el('span', 'dsh-val', unit ? (r.best.s + ' ' + unit) : String(r.best.s)));
            row.addEventListener('click', function () { showBoard(r.id, -1); });
            list.appendChild(row);
        });
        host.appendChild(list);
    }

    function localHubRows() {
        var data = readAll();
        var rows = [];
        Object.keys(GAMES).forEach(function (id) {
            var l = data[id];
            if (l && l.length) rows.push({ id: id, best: l[0] });
        });
        rows.sort(function (a, b) { return b.best.t - a.best.t; }); // newest record first
        return rows;
    }

    function renderHub(host) {
        if (!host) return;
        injectStyles();
        host.innerHTML = '';

        if (!isGlobal()) {
            paintHubRows(host, localHubRows());
            return;
        }

        host.appendChild(el('div', 'dsh-empty', 'Loading the world records…'));
        var ids = Object.keys(GAMES);
        Promise.all(ids.map(function (id) {
            return remoteTop(id).then(function (rows) {
                return rows.length ? { id: id, best: rows[0] } : null;
            }, function () { return null; });
        })).then(function (res) {
            var rows = res.filter(Boolean);
            host.innerHTML = '';
            if (!rows.length) {
                // every request failed, or nobody has played yet
                paintHubRows(host, localHubRows());
                return;
            }
            rows.sort(function (a, b) { return b.best.s - a.best.s; });
            paintHubRows(host, rows);
        });
    }

    var tag = document.currentScript ||
        document.querySelector('script[src*="scores.js"]');
    currentGame = tag && tag.getAttribute('data-game');

    function boot() {
        if (currentGame) makeButton(currentGame);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    window.DarkyScores = {
        submit: submit,
        open: function (g) { showBoard(g || currentGame, -1); },
        close: close,
        top: top,
        getName: getName,
        setName: setName,
        askName: function (g) { askName(g || currentGame, null, null); },
        games: GAMES,
        all: readAll,
        renderHub: renderHub
    };
})();
