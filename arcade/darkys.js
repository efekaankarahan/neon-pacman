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

    var RARITY = {
        free:      { name: 'Free',      color: '#7ee8ff', refund: 1 },
        common:    { name: 'Common',    color: '#b9b6cf', refund: 2 },
        uncommon:  { name: 'Uncommon',  color: '#4fe07a', refund: 5 },
        rare:      { name: 'Rare',      color: '#3fa8ff', refund: 15 },
        epic:      { name: 'Epic',      color: '#c06bff', refund: 40 },
        legendary: { name: 'Legendary', color: '#ffc83d', refund: 100 }
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
        { id: 'drako',   name: 'Drako',   em: '🐉', r: 'legendary' }
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

    function open(boxId) {
        var s = load(), box = BOXES[boxId];
        if (!box) return { error: 'No such box' };
        if (boxId === 'free' && freeReadyIn() > 0) return { error: 'The Free Box is not ready yet' };
        if (s.tokens < box.cost) return { error: 'Not enough tokens' };

        s.tokens -= box.cost;
        if (boxId === 'free') s.lastFree = Date.now();

        var r = rollRarity(box.odds);
        var pool = LIST.filter(function (d) { return d.r === r; });
        var d = pool[Math.floor(Math.random() * pool.length)];
        var isNew = !s.owned[d.id];
        var refund = 0;
        if (isNew) s.owned[d.id] = 1;
        else { s.owned[d.id]++; refund = RARITY[d.r].refund; s.tokens += refund; }
        save();
        return { darky: d, isNew: isNew, refund: refund };
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
        freeReadyIn: freeReadyIn,
        open: open
    };
})();
