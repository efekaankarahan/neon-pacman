/*
 * Darkys
 * ------
 * The Arcade's collectable characters. Everything lives in this browser's
 * localStorage, so there are no accounts: a player's Darkys, tokens and free
 * box timer stay on the device they play on.
 *
 * Every player starts with Darky, the free one, plus a few tokens. Tokens are
 * earned by playing Arcade games and spent on boxes. The Free Box opens once a
 * day for nothing. A duplicate Darky turns back into tokens.
 *
 * Usage: <script src="../darkys.js"></script>  (from a page inside arcade/)
 *        Darkys.selected()       -> the Darky the player plays as
 *        Darkys.addTokens(n)     -> after a game
 */
(function () {
    'use strict';

    var KEY = 'darkyplayDarkys';
    var DAY = 24 * 60 * 60 * 1000;

    // Launch tournament
    // -----------------
    // Etermaximus, the only Mystical Darky, never drops from a box. It sits
    // locked in the Market, and the only way to get it is to finish in the
    // top 5 of the Etermaximus Tournament: the best single Gold Quiz score
    // played between START and END (end of 21 November 2026, Pacific time).
    //
    // There is no shared online leaderboard on the site, so the other
    // entrants are bots. Each bot has a final score it reaches by the end and
    // climbs toward it as the tournament goes on, so the top 5 gets harder to
    // hold the later it gets. The bot list is the same for every player.
    // Round 2: a fresh 5-minute tournament, 22:06-22:11 Pacific on 19 Nov.
    // T_ID changes per round so every player's old best is wiped.
    var T_ID = 'r2';
    var T_START = Date.parse('2026-11-20T06:06:00Z');
    var T_END = Date.parse('2026-11-20T06:11:00Z');

    // The site owner always finishes first. Their device is marked by
    // opening any Arcade page once with ?owner=efe-9k27 in the address.
    var OWNER_KEY = 'darkyplayOwner';
    var OWNER_NAME = 'Efe 👑';
    var T_PRIZE_RANK = 5;
    var T_BOTS = [
        ['NovaKid', 3000], ['ZapZap', 2160], ['Pixelina', 1620], ['MrQuizz', 1260], ['Glimmer', 960],
        ['TurboTom', 860], ['Luma', 780], ['BeanBoss', 710], ['Kiko', 640], ['RocketRay', 580],
        ['Mimi99', 520], ['Sparky', 470], ['Dash', 420], ['Yuki', 380], ['Orbit', 350],
        ['FoxFire', 310], ['Bubbles', 280], ['Ace', 250], ['Nugget', 230], ['Moxie', 200],
        ['Zed', 180], ['Pepper', 160], ['Ziggy7', 140], ['Coco', 130], ['Bolt2', 110],
        ['Waffles', 100], ['Juno', 90], ['Taco', 80], ['Pip', 70], ['Rex10', 60],
        ['Sunny', 50], ['Milo', 40], ['Ivy', 30], ['Jax', 30], ['Lulu', 20],
        ['Nemo', 20], ['Pogo', 10], ['Kiwi', 10], ['Bo', 10], ['Tiny', 10]
    ];

    var RARITY = {
        free:      { name: 'Free',      color: '#7ee8ff', refund: 1 },
        common:    { name: 'Common',    color: '#b9b6cf', refund: 2 },
        uncommon:  { name: 'Uncommon',  color: '#4fe07a', refund: 5 },
        rare:      { name: 'Rare',      color: '#3fa8ff', refund: 15 },
        epic:      { name: 'Epic',      color: '#c06bff', refund: 40 },
        legendary: { name: 'Legendary', color: '#ffc83d', refund: 100 },
        mystical:  { name: 'Mystical',  color: '#ff5cf0', refund: 300 }
    };

    var LIST = [
        { id: 'darky',   name: 'Darky',   em: '🌚', r: 'free' },

        { id: 'froggo',  name: 'Froggo',  em: '🐸', r: 'common' },
        { id: 'foxy',    name: 'Foxy',    em: '🦊', r: 'common' },
        { id: 'bamboo',  name: 'Bamboo',  em: '🐼', r: 'common' },
        { id: 'inky',    name: 'Inky',    em: '🐙', r: 'common' },
        { id: 'waddle',  name: 'Waddle',  em: '🐧', r: 'common' },
        { id: 'shelly',  name: 'Shelly',  em: '🐢', r: 'common' },
        { id: 'chick',   name: 'Peep',    em: '🐥', r: 'common' },

        { id: 'hoot',    name: 'Hoot',    em: '🦉', r: 'uncommon' },
        { id: 'stripes', name: 'Stripes', em: '🐯', r: 'uncommon' },
        { id: 'gizmo',   name: 'Gizmo',   em: '🤖', r: 'uncommon' },
        { id: 'zorp',    name: 'Zorp',    em: '👽', r: 'uncommon' },
        { id: 'buzz',    name: 'Buzz',    em: '🐝', r: 'uncommon' },

        { id: 'sparkle', name: 'Sparkle', em: '🦄', r: 'rare' },
        { id: 'frosty',  name: 'Frosty',  em: '⛄', r: 'rare' },
        { id: 'shroom',  name: 'Shroom',  em: '🍄', r: 'rare' },
        { id: 'spook',   name: 'Spook',   em: '👻', r: 'rare' },

        { id: 'blaze',   name: 'Blaze',   em: '🐲', r: 'epic' },
        { id: 'kraken',  name: 'Kraken',  em: '🦑', r: 'epic' },
        { id: 'comet',   name: 'Comet',   em: '☄️', r: 'epic' },

        { id: 'rex',     name: 'King Rex', em: '🦖', r: 'legendary' },
        { id: 'drako',   name: 'Drako',   em: '🐉', r: 'legendary' },

        { id: 'etermaximus', name: 'Etermaximus', em: '🔮', r: 'mystical', market: true }
    ];

    var BOXES = {
        free: {
            name: 'Free Box', cost: 0, icon: '🎁',
            odds: { common: 75, uncommon: 22, rare: 3 }
        },
        dark: {
            name: 'Dark Box', cost: 25, icon: '📦',
            odds: { common: 52, uncommon: 30, rare: 13, epic: 4, legendary: 1 }
        }
    };

    var BY_ID = {};
    LIST.forEach(function (d) { BY_ID[d.id] = d; });

    // ---------------------------------------------------------------
    // storage
    // ---------------------------------------------------------------
    var mem = null;
    function fresh() {
        return { tokens: 25, owned: { darky: 1 }, selected: 'darky', lastFree: 0 };
    }
    function load() {
        if (mem) return mem;
        var s = null;
        try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { s = null; }
        if (!s || typeof s !== 'object' || !s.owned) s = fresh();
        if (!s.owned.darky) s.owned.darky = 1;                 // the free one is always yours
        if (typeof s.tokens !== 'number' || s.tokens < 0) s.tokens = 0;
        if (!BY_ID[s.selected] || !s.owned[s.selected]) s.selected = 'darky';
        if (s.tId !== T_ID) { s.tId = T_ID; s.tBest = 0; s.etermaxUnlocked = false; }   // new round: everyone from 0
        mem = s;
        return s;
    }
    function save() {
        try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* private mode: keep in memory */ }
    }

    // ---------------------------------------------------------------
    // api
    // ---------------------------------------------------------------
    function rollRarity(odds) {
        var total = 0, k;
        for (k in odds) total += odds[k];
        var x = Math.random() * total;
        for (k in odds) { x -= odds[k]; if (x < 0) return k; }
        return 'common';
    }

    function freeReadyIn() {
        var s = load();
        return Math.max(0, s.lastFree + DAY - Date.now());
    }

    // ---------------------------------------------------------------
    // tournament
    // ---------------------------------------------------------------
    function tState() {
        var now = Date.now();
        return now < T_START ? 'soon' : now < T_END ? 'live' : 'over';
    }

    function botScore(final, now) {
        if (now >= T_END) return final;
        if (now <= T_START) return 0;
        var p = (now - T_START) / (T_END - T_START);
        return Math.round(final * Math.pow(p, 0.8));
    }

    function playerName() {
        try { return (localStorage.getItem('darkyplayName') || 'You').slice(0, 12); } catch (e) { return 'You'; }
    }

    // Everyone in the tournament, best first, with the player marked me:true.
    function isOwner() {
        try {
            if (/[?&]owner=efe-9k27\b/.test(location.search)) localStorage.setItem(OWNER_KEY, '1');
            return localStorage.getItem(OWNER_KEY) === '1';
        } catch (e) { return false; }
    }

    function standings() {
        var s = load(), now = Math.min(Date.now(), T_END), owner = isOwner();
        var rows = T_BOTS.map(function (b) { return { name: b[0], score: botScore(b[1], now) }; });
        var mine = { name: owner ? OWNER_NAME : playerName(), score: s.tBest || 0, me: true };
        rows.push(mine);
        // the owner's entry always sits one step above everyone else
        var top = 0;
        rows.forEach(function (r) { if (!(owner && r.me)) top = Math.max(top, r.score); });
        if (owner) mine.score = Math.max(mine.score, top + 10);
        else rows.push({ name: OWNER_NAME, score: top + 10 });
        // a tie goes to the player
        rows.sort(function (a, b) { return (b.score - a.score) || ((b.me ? 1 : 0) - (a.me ? 1 : 0)); });
        rows.forEach(function (r, i) { r.rank = i + 1; });
        return rows;
    }

    function myRank() {
        var rows = standings();
        for (var i = 0; i < rows.length; i++) if (rows[i].me) return rows[i].rank;
        return rows.length;
    }

    // Called by Gold Quiz when a game ends. Returns true if it's a new best.
    function tSubmit(gold) {
        if (tState() !== 'live') return false;
        var s = load();
        if (gold > (s.tBest || 0)) { s.tBest = gold; save(); return true; }
        return false;
    }

    // After the tournament ends, a top-5 finish unlocks Etermaximus in the Market.
    function marketUnlocked() {
        var s = load();
        if (s.etermaxUnlocked) return true;
        if (tState() === 'over' && ((s.tBest || 0) > 0 || isOwner()) && myRank() <= T_PRIZE_RANK) {
            s.etermaxUnlocked = true;
            save();
            return true;
        }
        return false;
    }

    // Token prizes for the final standings: 1st 1,000,000,000, 2nd-3rd 10,000.
    // Paid once per round, the first time the player opens a page after the end.
    var T_PRIZES = { 1: 1000000000, 2: 10000, 3: 10000 };

    function claimPrize() {
        var s = load();
        if (tState() !== 'over' || s.tPaid === T_ID) return 0;
        var played = (s.tBest || 0) > 0 || isOwner();
        var amount = played ? (T_PRIZES[myRank()] || 0) : 0;
        s.tokens += amount;
        s.tPaid = T_ID;
        save();
        return amount;
    }

    function claimMarket(id) {
        var s = load(), d = BY_ID[id];
        if (!d || !d.market || !marketUnlocked() || s.owned[id]) return null;
        s.owned[id] = 1;
        save();
        return d;
    }

    function open(boxId) {
        var s = load(), box = BOXES[boxId];
        if (!box) return { error: 'No such box' };
        if (boxId === 'free' && freeReadyIn() > 0) return { error: 'The Free Box is not ready yet' };
        if (s.tokens < box.cost) return { error: 'Not enough tokens' };

        s.tokens -= box.cost;
        if (boxId === 'free') s.lastFree = Date.now();

        var r = rollRarity(box.odds);
        var pool = LIST.filter(function (d) { return d.r === r && !d.market; });
        var d = pool[Math.floor(Math.random() * pool.length)];
        var isNew = !s.owned[d.id];
        var refund = 0;
        if (isNew) s.owned[d.id] = 1;
        else { s.owned[d.id]++; refund = RARITY[d.r].refund; s.tokens += refund; }
        save();
        return { darky: d, isNew: isNew, refund: refund };
    }

    // Open the same box n times in one go (Dark Box packs of 10, 50, 100, 1000).
    // Pays for the whole pack up front, so it opens all n or none.
    var RANK = ['free', 'common', 'uncommon', 'rare', 'epic', 'legendary', 'mystical'];
    // Fast path: rolls n boxes in memory and saves once, so even millions of
    // boxes (Spend All) finish in a few seconds.
    function openMany(boxId, n, untilBroke) {
        var s = load(), box = BOXES[boxId];
        n = Math.max(1, Math.floor(n) || 1);
        if (!box || boxId === 'free') return { error: 'Packs are only for the Dark Box' };
        if (s.tokens < box.cost) return { error: 'Not enough tokens' };
        if (!untilBroke && s.tokens < box.cost * n) return { error: 'Not enough tokens' };

        var rar = [], cum = [], total = 0, k;
        for (k in box.odds) { total += box.odds[k]; rar.push(k); cum.push(total); }
        var pools = rar.map(function (r) { return LIST.filter(function (d) { return d.r === r && !d.market; }); });
        var counts = {}, refund = 0, opened = 0;

        // Open in rounds: pay for what the tokens cover, then spend the
        // duplicate refunds too when untilBroke is set.
        do {
            var batch = untilBroke ? Math.floor(s.tokens / box.cost) : n;
            if (batch < 1) break;
            s.tokens -= batch * box.cost;
            var gotBack = 0;
            for (var i = 0; i < batch; i++) {
                var x = Math.random() * total, ri = 0;
                while (x >= cum[ri]) ri++;
                var pool = pools[ri], d = pool[(Math.random() * pool.length) | 0];
                if (s.owned[d.id] || counts[d.id]) gotBack += RARITY[d.r].refund;
                counts[d.id] = (counts[d.id] || 0) + 1;
            }
            s.tokens += gotBack;
            refund += gotBack;
            opened += batch;
        } while (untilBroke);

        var list = [], fresh = 0;
        for (k in counts) {
            var isNew = !s.owned[k];
            if (isNew) fresh++;
            s.owned[k] = (s.owned[k] || 0) + counts[k];
            list.push({ darky: BY_ID[k], count: counts[k], isNew: isNew });
        }
        save();
        list.sort(function (a, b) { return (RANK.indexOf(b.darky.r) - RANK.indexOf(a.darky.r)) || (b.count - a.count); });
        return { count: opened, list: list, refund: refund, fresh: fresh };
    }

    window.Darkys = {
        LIST: LIST,
        RARITY: RARITY,
        BOXES: BOXES,
        get: function (id) { return BY_ID[id]; },
        tokens: function () { return load().tokens; },
        addTokens: function (n) {
            var s = load();
            s.tokens += Math.max(0, Math.round(n) || 0);
            save();
            return s.tokens;
        },
        owns: function (id) { return !!load().owned[id]; },
        count: function (id) { return load().owned[id] || 0; },
        ownedList: function () {
            var s = load();
            return LIST.filter(function (d) { return s.owned[d.id]; });
        },
        selected: function () { return BY_ID[load().selected] || BY_ID.darky; },
        select: function (id) {
            var s = load();
            if (s.owned[id]) { s.selected = id; save(); }
            return this.selected();
        },
        // Epic and Legendary Darkys the player owns: the ones Gold Quiz makes
        // you sell after too many wrong answers.
        sellable: function () {
            var s = load();
            return LIST.filter(function (d) { return s.owned[d.id] && (d.r === 'epic' || d.r === 'legendary'); });
        },
        sell: function (id) {
            var s = load(), d = BY_ID[id];
            if (!d || !s.owned[id] || d.r === 'free') return 0;
            s.owned[id]--;
            if (!s.owned[id]) {
                delete s.owned[id];
                if (s.selected === id) s.selected = 'darky';
            }
            var refund = RARITY[d.r].refund;
            s.tokens += refund;
            save();
            return refund;
        },
        freeReadyIn: freeReadyIn,
        tournament: {
            START: T_START,
            END: T_END,
            PRIZE_RANK: T_PRIZE_RANK,
            state: tState,
            endsIn: function () { return Math.max(0, T_END - Date.now()); },
            best: function () { return load().tBest || 0; },
            standings: standings,
            rank: myRank,
            submit: tSubmit
        },
        marketUnlocked: marketUnlocked,
        claimMarket: claimMarket,
        claimPrize: claimPrize,
        open: open,
        openMany: openMany,
        spendAll: function () { return openMany('dark', 1, true); }
    };
})();
