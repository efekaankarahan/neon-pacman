/*
 * DarkyPlay local leaderboard
 * ---------------------------
 * Keeps a top-10 per game, on this device, under one player name shared by
 * every game on the site. There is no server behind darkyplay.com, so these
 * boards are per-device: everyone playing on the same phone or computer
 * competes on the same list.
 *
 * Usage - one line per game, at the end of <body>:
 *   <script src="../shared/scores.js" data-game="long-towers"></script>
 *
 * Then, wherever the game ends:
 *   DarkyScores.submit('long-towers', score);
 */
(function () {
    'use strict';

    var NAME_KEY = 'darkyplayName';
    var DATA_KEY = 'darkyplayScores';
    var MAX_ROWS = 10;
    var MAX_NAME = 12;

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
        'long-towers': 'Long Towers'
    };

    // What one point means, so the board does not just say "score" everywhere
    var UNITS = {
        'iqur': 'IQ',
        'long-towers': 'floors',
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

    function showBoard(gameId, highlightIndex) {
        ensureOverlay();
        panel.innerHTML = '';

        panel.appendChild(el('div', 'dsc-title', 'Best on this device'));
        panel.appendChild(el('div', 'dsc-h', GAMES[gameId] || gameId));

        var rows = top(gameId, MAX_ROWS);
        if (!rows.length) {
            panel.appendChild(el('div', 'dsc-empty', 'No scores yet. Be the first!'));
        } else {
            var unit = UNITS[gameId] || '';
            var list = el('ul', 'dsc-list');
            rows.forEach(function (r, i) {
                var li = el('li', 'dsc-row p' + (i + 1) + (i === highlightIndex ? ' me' : ''));
                li.appendChild(el('span', 'dsc-pos', (i + 1) + '.'));
                li.appendChild(el('span', 'dsc-nm', r.n || 'Player'));
                li.appendChild(el('span', 'dsc-sc', unit ? (r.s + ' ' + unit) : String(r.s)));
                list.appendChild(li);
            });
            panel.appendChild(list);
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

        var input = document.createElement('input');
        input.className = 'dsc-input';
        input.type = 'text';
        input.maxLength = MAX_NAME;
        input.placeholder = 'Your name';
        input.value = getName();
        input.setAttribute('autocomplete', 'off');
        input.setAttribute('autocorrect', 'off');
        panel.appendChild(input);

        function save() {
            var n = setName(input.value) || 'Player';
            if (pendingScore != null) {
                var pos = record(gameId, pendingScore, n);
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

        var wouldRank = rankFor(gameId, score);
        if (!wouldRank) return 0;              // did not make the board, stay quiet

        var name = getName();

        // Let the game's own "game over" panel land first - otherwise the
        // board covers the final score before the player has read it.
        if (!name) {
            setTimeout(function () { askName(gameId, score, null); }, 900);
            return wouldRank;
        }
        var pos = record(gameId, score, name);
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
    function renderHub(host) {
        if (!host) return;
        injectStyles();
        host.innerHTML = '';

        var data = readAll();
        var rows = [];
        Object.keys(GAMES).forEach(function (id) {
            var list = data[id];
            if (list && list.length) rows.push({ id: id, best: list[0] });
        });

        if (!rows.length) {
            var none = el('div', 'dsh-empty', 'No records yet - play a game and set the first one.');
            host.appendChild(none);
            return;
        }

        rows.sort(function (a, b) { return b.best.t - a.best.t; }); // newest record first

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
