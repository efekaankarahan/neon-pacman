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

    // Drawn Darkys are pictures, not emoji: em holds an <img> tag and tx a
    // plain-text stand-in for places that can only show text.
    var XLOJO = 'data:image/webp;base64,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';
    function img(src) { return '<img class="dkimg" alt="" src="' + src + '">'; }
    try {
        var st = document.createElement('style');
        st.textContent = '.dkimg{width:1em;height:1em;object-fit:cover;vertical-align:middle;border-radius:.18em;display:inline-block}' +
            '.chroma{display:inline-block;animation:dkchroma 2.6s linear infinite}' +
            '@keyframes dkchroma{0%{filter:hue-rotate(0deg) saturate(1.6) drop-shadow(0 0 .1em #fff) drop-shadow(0 0 .22em #7dfcff)}' +
            '50%{filter:hue-rotate(180deg) saturate(1.6) drop-shadow(0 0 .14em #fff) drop-shadow(0 0 .3em #ff5cf0)}' +
            '100%{filter:hue-rotate(360deg) saturate(1.6) drop-shadow(0 0 .1em #fff) drop-shadow(0 0 .22em #7dfcff)}}' +
            '.dkspin{display:inline-block;animation:dkspin 3s linear infinite;filter:drop-shadow(0 0 .2em #9b6bff)}' +
            '@keyframes dkspin{to{transform:rotate(-360deg)}}' +
            '.dkfire{display:inline-block;animation:dkfire 1.2s ease-in-out infinite alternate}' +
            '@keyframes dkfire{from{filter:drop-shadow(0 0 .12em #ffb000)}to{filter:drop-shadow(0 0 .35em #ff3d00) brightness(1.15)}}' +
            '.dkgold{display:inline-block;filter:sepia(1) saturate(4) hue-rotate(-12deg) brightness(1.1) drop-shadow(0 0 .2em #ffc83d)}';
        document.head.appendChild(st);
    } catch (e) { /* no DOM */ }

    // Opening a page with ?claim=<code> gives that Unique Darky to this
    // device. The owner's device gets every Unique automatically.
    var UNIQUE_CLAIMS = { 'xlojo-7713': 'xlojo' };

    var RARITY = {
        free:      { name: 'Free',      color: '#7ee8ff', refund: 1 },
        common:    { name: 'Common',    color: '#b9b6cf', refund: 2 },
        uncommon:  { name: 'Uncommon',  color: '#4fe07a', refund: 5 },
        rare:      { name: 'Rare',      color: '#3fa8ff', refund: 15 },
        epic:      { name: 'Epic',      color: '#c06bff', refund: 40 },
        legendary: { name: 'Legendary', color: '#ffc83d', refund: 100 },
        // a glowing version of an existing Darky; new ones every year, only in Seasonal Packs
        chroma:    { name: 'Chroma',    color: '#7dfcff', refund: 1000 },
        mystical:  { name: 'Mystical',  color: '#ff5cf0', refund: 300 },
        // the 2 winners of the opening drawing contest; never in a box
        unique:    { name: 'Unique',    color: '#ff8a3d', refund: 500 },
        // Unique + Mystical + Chroma in one: the holiday Darkys, one per
        // special day, sold only on that day or week
        mystichroma: { name: 'Mystichroma', color: '#ffb36b', refund: 2000 },
        // the religious holiday Darkys: all equal, only in the Faith Pack
        sacred:    { name: 'Sacred',    color: '#ffe9a8', refund: 20 }
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

        { id: 'etermaximus', name: 'Etermaximus', em: '🔮', r: 'mystical', market: true },
        // Unique: winners of the opening drawing contest, drawn by players.
        // Never in a box; given with a claim link (see UNIQUE_CLAIMS).
        { id: 'xlojo', name: 'Xlojo', em: img(XLOJO), tx: '⚡', r: 'unique', unique: true },

        // Seasonal Darkys: only in their season's pack
        { id: 'snowpaw',  name: 'Snowpaw',     em: '🐻‍❄️', r: 'common',    season: 'winter' },
        { id: 'icicle',   name: 'Icicle',      em: '🧊', r: 'common',    season: 'winter' },
        { id: 'reindy',   name: 'Reindy',      em: '🦌', r: 'uncommon',  season: 'winter' },
        { id: 'mittens',  name: 'Mittens',     em: '🧤', r: 'uncommon',  season: 'winter' },
        { id: 'jingle',   name: 'Jingle',      em: '🎅', r: 'rare',      season: 'winter' },
        { id: 'blizzard', name: 'Blizzard',    em: '🌨️', r: 'epic',      season: 'winter' },
        { id: 'aurora',   name: 'Aurora',      em: '🌌', r: 'legendary', season: 'winter' },

        { id: 'bloom',    name: 'Bloom',       em: '🌸', r: 'common',    season: 'spring' },
        { id: 'bunbun',   name: 'Bunbun',      em: '🐇', r: 'common',    season: 'spring' },
        { id: 'dotty',    name: 'Dotty',       em: '🐞', r: 'uncommon',  season: 'spring' },
        { id: 'sprout',   name: 'Sprout',      em: '🌱', r: 'uncommon',  season: 'spring' },
        { id: 'rainbo',   name: 'Rainbo',      em: '🌈', r: 'rare',      season: 'spring' },
        { id: 'flutter',  name: 'Flutter',     em: '🦋', r: 'epic',      season: 'spring' },
        { id: 'sakura',   name: 'Sakura',      em: '🌺', r: 'legendary', season: 'spring' },

        { id: 'crabby',   name: 'Crabby',      em: '🦀', r: 'common',    season: 'summer' },
        { id: 'finny',    name: 'Finny',       em: '🐠', r: 'common',    season: 'summer' },
        { id: 'palmy',    name: 'Palmy',       em: '🌴', r: 'uncommon',  season: 'summer' },
        { id: 'coco',     name: 'Coco',        em: '🥥', r: 'uncommon',  season: 'summer' },
        { id: 'sunburst', name: 'Sunburst',    em: '🌞', r: 'rare',      season: 'summer' },
        { id: 'tsunami',  name: 'Tsunami',     em: '🌊', r: 'epic',      season: 'summer' },
        { id: 'sharko',   name: 'Sharko',      em: '🦈', r: 'legendary', season: 'summer' },

        { id: 'acorn',    name: 'Acorn',       em: '🌰', r: 'common',    season: 'autumn' },
        { id: 'leafy',    name: 'Leafy',       em: '🍂', r: 'common',    season: 'autumn' },
        { id: 'pumpkin',  name: 'Pumpkin',     em: '🎃', r: 'uncommon',  season: 'autumn' },
        { id: 'nutty',    name: 'Nutty',       em: '🐿️', r: 'uncommon',  season: 'autumn' },
        { id: 'batty',    name: 'Batty',       em: '🦇', r: 'rare',      season: 'autumn' },
        { id: 'harvest',  name: 'Harvest Moon', em: '🌕', r: 'epic',     season: 'autumn' },
        { id: 'witchy',   name: 'Witchy',      em: '🧙', r: 'legendary', season: 'autumn' }
    ];

    // Theme Packs
    // -----------
    // Always open. Each pack has its own Darkys that no other box gives.
    // [id, name, emoji (may be HTML), rarity, plain-text stand-in]
    function spin(e) { return '<span class="dkspin">' + e + '</span>'; }
    function fire(e) { return '<span class="dkfire">' + e + '</span>'; }
    function gold(e) { return '<span class="dkgold">' + e + '</span>'; }
    var THEMES = {
        space: { name: 'Space Pack', icon: '🚀', cost: 60, about: 'Rockets, planets and a Black Hole that never stops spinning.',
            odds: { common: 45, uncommon: 30, rare: 16, epic: 7, legendary: 2 }, list: [
            ['astro', 'Astro', '🧑‍🚀', 'common'], ['rocky', 'Rocky', '🚀', 'common'], ['moony', 'Moony', '🌒', 'common'],
            ['starry', 'Starry', '🌟', 'uncommon'], ['satty', 'Satty', '🛰️', 'uncommon'],
            ['ringo', 'Ringo', '🪐', 'rare'], ['ufo', 'UFO', '🛸', 'rare'],
            ['supernova', 'Supernova', '💥', 'epic'],
            ['blackhole', 'Black Hole', spin('🌀'), 'legendary', '🌀']] },
        ocean: { name: 'Ocean Pack', icon: '🌊', cost: 60, about: 'Deep-sea Darkys. Catch the rare Darky Fish in Fishing Frenzy for a free Ocean Pack!',
            odds: { common: 45, uncommon: 30, rare: 16, epic: 7, legendary: 2 }, list: [
            ['puffy', 'Puffy', '🐡', 'common'], ['clammy', 'Clammy', '🦪', 'common'], ['shrimpy', 'Shrimpy', '🦐', 'common'],
            ['jelly', 'Jelly', '🪼', 'uncommon'], ['sealy', 'Sealy', '🦭', 'uncommon'],
            ['dolphy', 'Dolphy', '🐬', 'rare'], ['lobby', 'Lobby', '🦞', 'rare'],
            ['bigblue', 'Big Blue', '🐋', 'epic'],
            ['coralqueen', 'Coral Queen', gold('🪸'), 'legendary', '🪸']] },
        myth: { name: 'Myth Pack', icon: '🐉', cost: 150, about: 'Legendary creatures only: no Commons, and the only box with a Mystical Darky.',
            odds: { rare: 50, epic: 32, legendary: 15, mystical: 3 }, list: [
            ['griffin', 'Griffin', '🦅', 'rare'], ['mermaid', 'Mermaid', '🧜‍♀️', 'rare'], ['fairy', 'Fairy', '🧚', 'rare'],
            ['pegasus', 'Pegasus', '🪽', 'epic'], ['genie', 'Genie', '🧞', 'epic'],
            ['cerberus', 'Cerberus', '🐺', 'legendary'], ['cyclops', 'Cyclops', '👁️', 'legendary'],
            ['phoenix', 'Phoenix', fire('🐦'), 'mystical', '🐦']] },
        food: { name: 'Food Pack', icon: '🍕', cost: 20, about: 'Cheap and tasty. Simit, döner and a golden ice cream.',
            odds: { common: 52, uncommon: 30, rare: 13, epic: 4, legendary: 1 }, list: [
            ['pizza', 'Pizza', '🍕', 'common'], ['burger', 'Burger', '🍔', 'common'], ['fries', 'Fries', '🍟', 'common'],
            ['simit', 'Simit', '🥯', 'uncommon'], ['donut', 'Donut', '🍩', 'uncommon'],
            ['sushi', 'Sushi', '🍣', 'rare'], ['doner', 'Döner', '🥙', 'rare'],
            ['cakey', 'Cakey', '🎂', 'epic'],
            ['goldcone', 'Golden Cone', gold('🍦'), 'legendary', '🍦']] },
        retro: { name: 'Retro Arcade Pack', icon: '🕹️', cost: 60, about: 'Darkys from the games on Darky Play: Neon Pacman, Pro Snake, Happy Bird and more.',
            odds: { common: 45, uncommon: 30, rare: 16, epic: 7, legendary: 2 }, list: [
            ['neonghost', 'Neon Ghost', '👾', 'common'], ['prosnek', 'Pro Snek', '🐍', 'common'], ['flappy', 'Happy Flap', '🐤', 'common'],
            ['bricky', 'Bricky', '🧱', 'uncommon'], ['tictac', 'Tic Tac', '⭕', 'uncommon'],
            ['starfighter', 'Starfighter', '🛩️', 'rare'], ['brawler', 'Brawler', '🥊', 'rare'],
            ['bluewarrior', 'Blue Warrior', '🛡️', 'epic'],
            ['joyking', 'Joystick King', gold('🕹️'), 'legendary', '🕹️']] },
        dino: { name: 'Dino Pack', icon: '🦖', cost: 50, about: 'Back from 66 million years ago.',
            odds: { common: 45, uncommon: 30, rare: 16, epic: 7, legendary: 2 }, list: [
            ['eggy', 'Eggy', '🥚', 'common'], ['longneck', 'Longneck', '🦕', 'common'], ['ferny', 'Ferny', '🌿', 'common'],
            ['raptor', 'Raptor', '🦎', 'uncommon'], ['ptero', 'Ptero', '🦤', 'uncommon'],
            ['trike', 'Trike', '🦏', 'rare'], ['volcano', 'Volcano', '🌋', 'rare'],
            ['mammoth', 'Mammoth', '🦣', 'epic'],
            ['fossil', 'Fossil Rex', gold('🦴'), 'legendary', '🦴']] }
    };
    var THEME_ORDER = ['space', 'ocean', 'myth', 'food', 'retro', 'dino'];
    THEME_ORDER.forEach(function (k) {
        THEMES[k].list.forEach(function (t) {
            var d = { id: k + '-' + t[0], name: t[1], em: t[2], r: t[3], theme: k };
            if (t[4]) d.tx = t[4];
            LIST.push(d);
        });
    });

    // Religious holiday Darkys: one for each big holiday of the world's
    // faiths. All Sacred, all equally likely, only from the Faith Pack.
    [
        ['ramazan',    'Crescent',     '🌙', 'Islam · Eid al-Fitr (Ramazan Bayramı)'],
        ['kurban',     'Lamby',        '🐑', 'Islam · Eid al-Adha (Kurban Bayramı)'],
        ['kadir',      'Night Mosque', '🕌', 'Islam · Laylat al-Qadr (Kadir Gecesi)'],
        ['mevlid',     'Rose Light',   '💫', 'Islam · Mawlid (Mevlid Kandili)'],
        ['hicri',      'Hijri Star',   '⭐', 'Islam · Islamic New Year'],
        ['asure',      'Aşure',        '🍲', 'Islam · Ashura (Aşure Günü)'],
        ['noel',       'Jingle Bell',  '🔔', 'Christianity · Christmas'],
        ['paskalya',   'Chickpip',     '🐣', 'Christianity · Easter'],
        ['epiphany',   'Three Crowns', '👑', 'Christianity · Epiphany'],
        ['pentecost',  'Dove',         '🕊️', 'Christianity · Pentecost'],
        ['allsaints',  'Candlelight',  '🕯️', "Christianity · All Saints' Day"],
        ['hanukkah',   'Menorah',      '🕎', 'Judaism · Hanukkah'],
        ['pesach',     'Matzah',       '🫓', 'Judaism · Passover'],
        ['roshhash',   'Honey Apple',  '🍎', 'Judaism · Rosh Hashanah'],
        ['yomkippur',  'Shofar',       '📯', 'Judaism · Yom Kippur'],
        ['purim',      'Masky',        '🎭', 'Judaism · Purim'],
        ['sukkot',     'Lulav',        '🌿', 'Judaism · Sukkot'],
        ['diwali',     'Diya',         '🪔', 'Hinduism · Diwali'],
        ['holi',       'Color Splash', '🎨', 'Hinduism · Holi'],
        ['navratri',   'Dhol',         '🪘', 'Hinduism · Navratri'],
        ['ganesh',     'Gajju',        '🐘', 'Hinduism · Ganesh Chaturthi'],
        ['rakhi',      'Rakhi',        '🧵', 'Hinduism · Raksha Bandhan'],
        ['vesak',      'Lotus',        '🪷', 'Buddhism · Vesak'],
        ['bodhi',      'Bodhi Leaf',   '🌳', 'Buddhism · Bodhi Day'],
        ['obon',       'Obon Lantern', '🏮', 'Buddhism · Obon'],
        ['vaisakhi',   'Harvest',      '🌾', 'Sikhism · Vaisakhi'],
        ['gurpurab',   'Golden Light', '✨', 'Sikhism · Guru Nanak Gurpurab'],
        ['paryushana', 'Namaste',      '🙏', 'Jainism · Paryushana'],
        ['ridvan',     'Ridván Rose',  '🌹', "Bahá'í · Ridván"],
        ['sadeh',      'Sadeh Flame',  '🔥', 'Zoroastrianism · Sadeh'],
        ['shogatsu',   'Kadomatsu',    '🎍', 'Shinto · Shōgatsu'],
        ['midautumn',  'Mooncake',     '🥮', 'Chinese tradition · Mid-Autumn Festival']
    ].forEach(function (h) {
        LIST.push({ id: 'holy-' + h[0], name: h[1], em: h[2], r: 'sacred', holy: true, where: h[3] });
    });

    // Chroma Darkys
    // -------------
    // Each year brings 1 to 3 new Chromas: glowing versions of existing
    // Darkys. That year's Chromas can drop from any Seasonal Pack.
    var CHROMA_YEARS = {
        2026: ['drako'],
        2027: ['blaze', 'sparkle'],
        2028: ['rex'],
        2029: ['kraken', 'hoot', 'foxy'],
        2030: ['comet'],
        2031: ['spook', 'gizmo'],
        2032: ['frosty'],
        2033: ['zorp', 'stripes'],
        2034: ['shroom'],
        2035: ['inky', 'waddle', 'bamboo'],
        2036: ['froggo'],
        2037: ['buzz', 'chick'],
        2038: ['shelly'],
        2039: ['darky'],
        2040: ['xlojo', 'etermaximus']
    };
    var CHROMA_FIRST = 2026, CHROMA_LAST = 2040;
    (function () {
        var base = {};
        LIST.forEach(function (d) { base[d.id] = d; });
        Object.keys(CHROMA_YEARS).forEach(function (y) {
            CHROMA_YEARS[y].forEach(function (id) {
                var b = base[id];
                LIST.push({
                    id: 'chroma-' + y + '-' + id, name: 'Chroma ' + b.name,
                    em: '<span class="chroma">' + b.em + '</span>', tx: b.tx || b.em,
                    r: 'chroma', chroma: +y, base: id
                });
            });
        });
    })();

    // Seasonal Packs
    // --------------
    // Each pack opens for one day a year, on the first day of its season
    // (the player's local date). The site owner can open them any day.
    var SEASONS = {
        winter: { name: 'Winter Pack', icon: '❄️', month: 11, opens: 'DEC 1' },
        spring: { name: 'Spring Pack', icon: '🌸', month: 2,  opens: 'MAR 1' },
        summer: { name: 'Summer Pack', icon: '☀️', month: 5,  opens: 'JUN 1' },
        autumn: { name: 'Autumn Pack', icon: '🍂', month: 8,  opens: 'SEP 1' }
    };
    var SEASON_ODDS = { common: 40, uncommon: 30, rare: 18, epic: 8, legendary: 3, chroma: 1 };

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
    BOXES.holy = { name: 'Faith Pack', cost: 50, icon: '🛐', odds: { sacred: 1 } };
    THEME_ORDER.forEach(function (k) {
        var T = THEMES[k];
        BOXES[k] = { name: T.name, cost: T.cost, icon: T.icon, theme: k, odds: T.odds };
    });
    Object.keys(SEASONS).forEach(function (k) {
        BOXES[k] = { name: SEASONS[k].name, cost: 100, icon: SEASONS[k].icon, season: k, odds: SEASON_ODDS };
    });

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
        var claim = (location.search.match(/[?&]claim=([\w-]+)/) || [])[1];
        if (claim && UNIQUE_CLAIMS[claim]) s.owned[UNIQUE_CLAIMS[claim]] = s.owned[UNIQUE_CLAIMS[claim]] || 1;
        if (isOwner()) LIST.forEach(function (d) { if ((d.unique || d.theme) && !s.owned[d.id]) s.owned[d.id] = 1; });
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
        if (!d || !d.market || d.unique || !marketUnlocked() || s.owned[id]) return null;
        s.owned[id] = 1;
        save();
        return d;
    }

    function seasonOpen(id) {
        if (!SEASONS[id]) return false;
        if (isOwner()) return true;
        var d = new Date();
        return d.getMonth() === SEASONS[id].month && d.getDate() === 1;
    }
    // The next day the pack opens (today if it is open today), as a Date.
    function nextOpen(id) {
        var now = new Date(), y = now.getFullYear(), m = SEASONS[id].month;
        var d = new Date(y, m, 1);
        if (d < new Date(y, now.getMonth(), now.getDate())) d = new Date(y + 1, m, 1);
        return d;
    }
    function chromaYear() {
        var y = new Date().getFullYear();
        if (isOwner()) {
            var o = load().ownerYear;
            if (o >= CHROMA_FIRST && o <= CHROMA_LAST) return o;
        }
        return y;
    }
    function chromasOf(year) {
        return LIST.filter(function (d) { return d.chroma === year; });
    }

    // The Darkys a box can drop at a rarity.
    function poolFor(box, r) {
        if (r === 'chroma') {
            var c = chromasOf(chromaYear());
            return c.length ? c : poolFor(box, 'legendary');
        }
        return LIST.filter(function (d) {
            return d.r === r && !d.market && !d.unique && !d.chroma && (box.season ? d.season === box.season : !d.season) &&
                (box.theme ? d.theme === box.theme : !d.theme);
        });
    }

    function open(boxId) {
        var s = load(), box = BOXES[boxId];
        if (!box) return { error: 'No such box' };
        if (box.season && !seasonOpen(boxId)) return { error: 'This pack is locked today' };
        if (boxId === 'free' && freeReadyIn() > 0) return { error: 'The Free Box is not ready yet' };
        if (s.tokens < box.cost) return { error: 'Not enough tokens' };

        s.tokens -= box.cost;
        if (boxId === 'free') { s.lastFree = Date.now(); bump(s, 'free', 1); }
        if (boxId === 'holy') bump(s, 'faith', 1);
        bump(s, 'boxes', 1);

        var r = rollRarity(box.odds);
        var pool = poolFor(box, r);
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
    var MAX_OPEN = 20000000;

    // Holiday Darkys
    // --------------
    // Every special day around the world has its own glowing Darky: the big
    // world holidays below plus the national day of every one of the 195
    // countries. A day's Darkys are on sale from that day until the next
    // special day starts (at most a week), for EVENT_COST tokens, one each
    // per player. Dates use the player's local date.
    var EVENT_COST = 200, WEEK = 7 * DAY;
    var LUNAR = { 2026: [1, 17], 2027: [1, 6], 2028: [0, 26], 2029: [1, 13], 2030: [1, 3], 2031: [0, 23], 2032: [1, 11],
        2033: [0, 31], 2034: [1, 19], 2035: [1, 8], 2036: [0, 28], 2037: [1, 15], 2038: [1, 4], 2039: [0, 24], 2040: [1, 12] };
    function easter(y) {
        var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4,
            f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30,
            i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
        var mo = Math.floor((h + l - 7 * m + 114) / 31), dd = ((h + l - 7 * m + 114) % 31) + 1;
        return [mo - 1, dd];
    }
    function thanksgiving(y) {
        var w = new Date(y, 10, 1).getDay();
        return [10, 1 + ((4 - w + 7) % 7) + 21];
    }
    // [id, name, emoji, where, month (0-11) and day, or a function of the year]
    var EVENTS = [
        ['newyear',     'Nova Year',     '🎆', 'Worldwide · New Year',             [0, 1]],
        ['lunar',       'Lucky Lantern', '🧧', 'East Asia · Lunar New Year',       function (y) { return LUNAR[y]; }],
        ['valentine',   'Lovebug',       '💘', "Worldwide · Valentine's Day",      [1, 14]],
        ['womens',      'Bloom Queen',   '💐', "Worldwide · Women's Day",          [2, 8]],
        ['patrick',     'Lucky Clover',  '☘️', "Ireland · St. Patrick's Day",      [2, 17]],
        ['nowruz',      'Nowruz Tulip',  '🌷', 'Iran & Central Asia · Nowruz',     [2, 21]],
        ['fools',       'Prankster',     '🤡', "Worldwide · April Fools' Day",     [3, 1]],
        ['easter',      'Eggbert',       '🥚', 'Worldwide · Easter',               easter],
        ['earth',       'Gaia',          '🌍', 'Worldwide · Earth Day',            [3, 22]],
        ['cocuk',       'Balloonie',     '🎈', "Türkiye · Children's Day",         [3, 23]],
        ['cinco',       'Piñata',        '🪅', 'Mexico · Cinco de Mayo',           [4, 5]],
        ['genclik',     'Sprinty',       '🏃', 'Türkiye · Youth & Sports Day',     [4, 19]],
        ['canada',      'Maple',         '🍁', 'Canada · Canada Day',              [6, 1]],
        ['usa',         'Liberty Spark', '🎇', 'USA · Independence Day',           [6, 4]],
        ['bastille',    'Baguette',      '🥖', 'France · Bastille Day',            [6, 14]],
        ['india',       'Kite Flyer',    '🪁', 'India · Independence Day',         [7, 15]],
        ['zafer',       'Victory',       '🏅', 'Türkiye · Victory Day',            [7, 30]],
        ['brazil',      'Arara',         '🦜', 'Brazil · Independence Day',        [8, 7]],
        ['mexico',      'Chili',         '🌶️', 'Mexico · Independence Day',        [8, 16]],
        ['germany',     'Pretzel',       '🥨', 'Germany · Unity Day',              [9, 3]],
        ['cumhuriyet',  'Republic Star', '🇹🇷', 'Türkiye · Republic Day',           [9, 29]],
        ['halloween',   'Webby',         '🕸️', 'Worldwide · Halloween',            [9, 31]],
        ['muertos',     'Calavera',      '💀', 'Mexico · Day of the Dead',         [10, 1]],
        ['bonfire',     'Bonfire',       '🔥', 'UK · Bonfire Night',               [10, 5]],
        ['thanks',      'Gobbler',       '🦃', 'USA · Thanksgiving',               thanksgiving],
        ['xmas',        'Starry Tree',   '🎄', 'Worldwide · Christmas',            [11, 25]]
    ].map(function (e) {
        var d = { id: 'ev-' + e[0], name: e[1], em: '<span class="chroma">' + e[2] + '</span>', tx: e[2],
            r: 'mystichroma', event: true, where: e[3], when: e[4] };
        LIST.push(d); BY_ID[d.id] = d;
        return d;
    });
    // National days: code|country|month-day|I (Independence Day) or N (National Day).
    // Canada, USA, France, India, Brazil, Mexico, Germany, Ireland, Iran,
    // Türkiye and the UK already have their days in the list above.
    var NATIONAL = 'AF|Afghanistan|8-19|I;AL|Albania|11-28|I;DZ|Algeria|7-5|I;AD|Andorra|9-8|N;AO|Angola|11-11|I;' +
        'AG|Antigua and Barbuda|11-1|I;AR|Argentina|7-9|I;AM|Armenia|9-21|I;AU|Australia|1-26|N;AT|Austria|10-26|N;' +
        'AZ|Azerbaijan|5-28|I;BS|Bahamas|7-10|I;BH|Bahrain|12-16|N;BD|Bangladesh|3-26|I;BB|Barbados|11-30|I;' +
        'BY|Belarus|7-3|I;BE|Belgium|7-21|N;BZ|Belize|9-21|I;BJ|Benin|8-1|I;BT|Bhutan|12-17|N;BO|Bolivia|8-6|I;' +
        'BA|Bosnia and Herzegovina|3-1|I;BW|Botswana|9-30|I;BN|Brunei|2-23|N;BG|Bulgaria|3-3|N;BF|Burkina Faso|8-5|I;' +
        'BI|Burundi|7-1|I;CV|Cabo Verde|7-5|I;KH|Cambodia|11-9|I;CM|Cameroon|5-20|N;CF|Central African Republic|8-13|I;' +
        'TD|Chad|8-11|I;CL|Chile|9-18|I;CN|China|10-1|N;CO|Colombia|7-20|I;KM|Comoros|7-6|I;CG|Congo|8-15|I;' +
        'CD|DR Congo|6-30|I;CR|Costa Rica|9-15|I;CI|Côte d\'Ivoire|8-7|I;HR|Croatia|5-30|N;CU|Cuba|1-1|N;' +
        'CY|Cyprus|10-1|I;CZ|Czechia|10-28|N;DK|Denmark|6-5|N;DJ|Djibouti|6-27|I;DM|Dominica|11-3|I;' +
        'DO|Dominican Republic|2-27|I;EC|Ecuador|8-10|I;EG|Egypt|7-23|N;SV|El Salvador|9-15|I;' +
        'GQ|Equatorial Guinea|10-12|I;ER|Eritrea|5-24|I;EE|Estonia|2-24|I;SZ|Eswatini|9-6|I;ET|Ethiopia|5-28|N;' +
        'FJ|Fiji|10-10|I;FI|Finland|12-6|I;GA|Gabon|8-17|I;GM|Gambia|2-18|I;GE|Georgia|5-26|I;GH|Ghana|3-6|I;' +
        'GR|Greece|3-25|I;GD|Grenada|2-7|I;GT|Guatemala|9-15|I;GN|Guinea|10-2|I;GW|Guinea-Bissau|9-24|I;' +
        'GY|Guyana|5-26|I;HT|Haiti|1-1|I;HN|Honduras|9-15|I;HU|Hungary|8-20|N;IS|Iceland|6-17|N;ID|Indonesia|8-17|I;' +
        'IQ|Iraq|10-3|N;IL|Israel|5-14|I;IT|Italy|6-2|N;JM|Jamaica|8-6|I;JP|Japan|2-11|N;JO|Jordan|5-25|I;' +
        'KZ|Kazakhstan|12-16|I;KE|Kenya|12-12|I;KI|Kiribati|7-12|I;KW|Kuwait|2-25|N;KG|Kyrgyzstan|8-31|I;' +
        'LA|Laos|12-2|N;LV|Latvia|11-18|I;LB|Lebanon|11-22|I;LS|Lesotho|10-4|I;LR|Liberia|7-26|I;LY|Libya|12-24|I;' +
        'LI|Liechtenstein|8-15|N;LT|Lithuania|2-16|I;LU|Luxembourg|6-23|N;MG|Madagascar|6-26|I;MW|Malawi|7-6|I;' +
        'MY|Malaysia|8-31|I;MV|Maldives|7-26|I;ML|Mali|9-22|I;MT|Malta|9-21|I;MH|Marshall Islands|5-1|N;' +
        'MR|Mauritania|11-28|I;MU|Mauritius|3-12|I;FM|Micronesia|11-3|I;MD|Moldova|8-27|I;MC|Monaco|11-19|N;' +
        'MN|Mongolia|7-11|N;ME|Montenegro|7-13|N;MA|Morocco|7-30|N;MZ|Mozambique|6-25|I;MM|Myanmar|1-4|I;' +
        'NA|Namibia|3-21|I;NR|Nauru|1-31|I;NP|Nepal|5-28|N;NL|Netherlands|4-27|N;NZ|New Zealand|2-6|N;' +
        'NI|Nicaragua|9-15|I;NE|Niger|8-3|I;NG|Nigeria|10-1|I;KP|North Korea|9-9|N;MK|North Macedonia|9-8|I;' +
        'NO|Norway|5-17|N;OM|Oman|11-20|N;PK|Pakistan|8-14|I;PW|Palau|10-1|I;PS|Palestine|11-15|I;PA|Panama|11-3|I;' +
        'PG|Papua New Guinea|9-16|I;PY|Paraguay|5-15|I;PE|Peru|7-28|I;PH|Philippines|6-12|I;PL|Poland|11-11|I;' +
        'PT|Portugal|6-10|N;QA|Qatar|12-18|N;RO|Romania|12-1|N;RU|Russia|6-12|N;RW|Rwanda|7-1|I;' +
        'KN|Saint Kitts and Nevis|9-19|I;LC|Saint Lucia|2-22|I;VC|Saint Vincent and the Grenadines|10-27|I;' +
        'WS|Samoa|6-1|I;SM|San Marino|9-3|N;ST|São Tomé and Príncipe|7-12|I;SA|Saudi Arabia|9-23|N;SN|Senegal|4-4|I;' +
        'RS|Serbia|2-15|N;SC|Seychelles|6-29|I;SL|Sierra Leone|4-27|I;SG|Singapore|8-9|N;SK|Slovakia|8-29|N;' +
        'SI|Slovenia|6-25|N;SB|Solomon Islands|7-7|I;SO|Somalia|7-1|I;ZA|South Africa|4-27|N;KR|South Korea|10-3|N;' +
        'SS|South Sudan|7-9|I;ES|Spain|10-12|N;LK|Sri Lanka|2-4|I;SD|Sudan|1-1|I;SR|Suriname|11-25|I;SE|Sweden|6-6|N;' +
        'CH|Switzerland|8-1|N;SY|Syria|4-17|I;TJ|Tajikistan|9-9|I;TZ|Tanzania|4-26|N;TH|Thailand|12-5|N;' +
        'TL|Timor-Leste|5-20|I;TG|Togo|4-27|I;TO|Tonga|6-4|N;TT|Trinidad and Tobago|8-31|I;TN|Tunisia|3-20|I;' +
        'TM|Turkmenistan|9-27|I;TV|Tuvalu|10-1|I;UG|Uganda|10-9|I;UA|Ukraine|8-24|I;AE|United Arab Emirates|12-2|N;' +
        'UY|Uruguay|8-25|I;UZ|Uzbekistan|9-1|I;VU|Vanuatu|7-30|I;VA|Vatican City|5-8|N;VE|Venezuela|7-5|I;' +
        'VN|Vietnam|9-2|N;YE|Yemen|5-22|N;ZM|Zambia|10-24|I;ZW|Zimbabwe|4-18|I;';
    function flag(code) {
        return String.fromCodePoint(0x1F1E6 + code.charCodeAt(0) - 65, 0x1F1E6 + code.charCodeAt(1) - 65);
    }
    NATIONAL.split(';').forEach(function (row) {
        if (!row) return;
        var f = row.split('|'), md = f[2].split('-');
        var d = { id: 'ev-' + f[0].toLowerCase(), name: f[1] + ' Spirit', em: '<span class="chroma">' + flag(f[0]) + '</span>', tx: flag(f[0]),
            r: 'mystichroma', event: true, where: f[1] + ' · ' + (f[3] === 'I' ? 'Independence Day' : 'National Day'),
            when: [+md[0] - 1, +md[1]] };
        LIST.push(d); BY_ID[d.id] = d; EVENTS.push(d);
    });
    function eventStart(ev, y) {
        var md = typeof ev.when === 'function' ? ev.when(y) : ev.when;
        return md ? new Date(y, md[0], md[1]) : null;
    }
    // Every holiday date around now, in order: { start, end, darkys: [...] }.
    // Darkys that share a date go on sale together.
    function eventSlots() {
        var y = new Date().getFullYear(), by = {};
        [y - 1, y, y + 1].forEach(function (yy) {
            EVENTS.forEach(function (ev) {
                var st = eventStart(ev, yy);
                if (!st) return;
                var k = st.getTime();
                (by[k] = by[k] || { start: st, darkys: [] }).darkys.push(ev);
            });
        });
        var all = Object.keys(by).map(function (k) { return by[k]; });
        all.sort(function (a, b) { return a.start - b.start; });
        all.forEach(function (sl, i) {
            var next = all[i + 1] ? all[i + 1].start.getTime() : Infinity;
            sl.end = new Date(Math.min(sl.start.getTime() + WEEK, next));
        });
        return all;
    }
    // The holiday Darkys on sale right now (or null), and the next ones.
    function eventNow() {
        var now = Date.now(), slots = eventSlots(), live = null, next = null;
        for (var i = 0; i < slots.length; i++) {
            if (slots[i].start <= now && now < slots[i].end) live = slots[i];
            if (!next && slots[i].start > now) next = slots[i];
        }
        return { live: live, next: next };
    }
    function buyEvent(id) {
        var s = load(), d = BY_ID[id], cur = eventNow().live;
        if (!d || !d.event) return { error: 'No such Darky' };
        if (s.owned[id]) return { error: 'You already have it' };
        if (!isOwner() && (!cur || cur.darkys.indexOf(d) < 0)) return { error: 'Not on sale today' };
        if (s.tokens < EVENT_COST) return { error: 'Not enough tokens' };
        s.tokens -= EVENT_COST;
        s.owned[id] = 1;
        save();
        return { darky: d };
    }
    var RANK = ['free', 'common', 'uncommon', 'rare', 'epic', 'legendary', 'chroma', 'mystical', 'unique'];
    // Fast path: rolls n boxes in memory and saves once, so even millions of
    // boxes (Spend All) finish in a few seconds.
    function openMany(boxId, n, untilBroke) {
        var s = load(), box = BOXES[boxId];
        n = Math.max(1, Math.floor(n) || 1);
        if (!box || boxId === 'free') return { error: 'Packs are only for the Dark Box' };
        if (box.season && !seasonOpen(boxId)) return { error: 'This pack is locked today' };
        if (s.tokens < box.cost) return { error: 'Not enough tokens' };
        if (!untilBroke && s.tokens < box.cost * n) return { error: 'Not enough tokens' };

        var rar = [], cum = [], total = 0, k;
        for (k in box.odds) { total += box.odds[k]; rar.push(k); cum.push(total); }
        var pools = rar.map(function (r) { return poolFor(box, r); });
        var counts = {}, refund = 0, opened = 0;

        // Open in rounds: pay for what the tokens cover, then spend the
        // duplicate refunds too when untilBroke is set.
        // At most MAX_OPEN boxes per call, so a huge balance can't freeze the page.
        do {
            var batch = Math.min(untilBroke ? Math.floor(s.tokens / box.cost) : n, MAX_OPEN - opened);
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
        } while (untilBroke && opened < MAX_OPEN);

        bump(s, 'boxes', opened);
        if (boxId === 'holy' && opened) bump(s, 'faith', opened);
        var list = [], fresh = 0;
        for (k in counts) {
            var isNew = !s.owned[k];
            if (isNew) fresh++;
            s.owned[k] = (s.owned[k] || 0) + counts[k];
            list.push({ darky: BY_ID[k], count: counts[k], isNew: isNew });
        }
        save();
        list.sort(function (a, b) { return (RANK.indexOf(b.darky.r) - RANK.indexOf(a.darky.r)) || (b.count - a.count); });
        return { count: opened, list: list, refund: refund, fresh: fresh, capped: opened >= MAX_OPEN && s.tokens >= box.cost };
    }

    // Daily quests and streak
    // -----------------------
    // Three quests a day (the same three for everyone on that date) and a
    // daily reward that grows while the player comes back every day.
    var QUESTS = [
        // group 0: play
        [['play1', 'Play 1 Arcade game', 'games', 1, 25], ['play3', 'Play 3 Arcade games', 'games', 3, 60],
         ['win1', 'Win an Arcade game (1st place)', 'wins', 1, 50]],
        // group 1: skill
        [['right20', 'Answer 20 questions right', 'correct', 20, 40], ['right50', 'Answer 50 questions right', 'correct', 50, 90],
         ['gold500', 'Get 500 gold in one Gold Quiz game', 'bestGold', 500, 50]],
        // group 2: collect
        [['box5', 'Open 5 boxes or packs', 'boxes', 5, 30], ['box25', 'Open 25 boxes or packs', 'boxes', 25, 60],
         ['free1', 'Open the Free Box', 'free', 1, 20], ['faith1', 'Open a Faith Pack', 'faith', 1, 40]]
    ];
    var STREAK = [20, 30, 40, 60, 80, 100, 200];
    function dayKey(d) { d = d || new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
    function daily(s) {
        var k = dayKey();
        if (!s.daily || s.daily.day !== k) s.daily = { day: k, prog: {}, done: {} };
        return s.daily;
    }
    function bump(s, what, n) {
        var dl = daily(s), st = s.stats = s.stats || {};
        if (what === 'bestGold') { dl.prog[what] = Math.max(dl.prog[what] || 0, n); st[what] = Math.max(st[what] || 0, n); }
        else { dl.prog[what] = (dl.prog[what] || 0) + n; st[what] = (st[what] || 0) + n; }
    }
    function hash(str) { var h = 7; for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h; }
    function todaysQuests() {
        var s = load(), dl = daily(s), h = hash(dl.day);
        return QUESTS.map(function (g, i) {
            var q = g[(h >>> (i * 4)) % g.length], have = Math.min(q[3], dl.prog[q[2]] || 0);
            return { id: q[0], text: q[1], goal: q[3], reward: q[4], have: have, ready: have >= q[3], claimed: !!dl.done[q[0]] };
        });
    }
    function claimQuest(id) {
        var s = load(), dl = daily(s), q = todaysQuests().filter(function (x) { return x.id === id; })[0];
        if (!q || !q.ready || q.claimed) return 0;
        dl.done[id] = true;
        s.stats = s.stats || {};
        s.stats.quests = (s.stats.quests || 0) + 1;
        s.tokens += q.reward;
        save();
        return q.reward;
    }
    function streakInfo() {
        var s = load(), st = s.streak || { last: '', n: 0 }, today = dayKey();
        var y = new Date(); y.setDate(y.getDate() - 1);
        var next = st.last === today ? st.n : (st.last === dayKey(y) ? st.n + 1 : 1);
        return { claimedToday: st.last === today, day: next, reward: STREAK[(next - 1) % STREAK.length], table: STREAK };
    }
    function claimStreak() {
        var s = load(), info = streakInfo();
        if (info.claimedToday) return 0;
        s.streak = { last: dayKey(), n: info.day };
        s.stats = s.stats || {};
        s.stats.bestStreak = Math.max(s.stats.bestStreak || 0, info.day);
        s.tokens += info.reward;
        save();
        return info.reward;
    }

    // Badges
    // ------
    // Goals across the whole game. Each one pays tokens once, when claimed.
    // [id, icon, name, what to do, reward, function returning [have, goal]]
    function ownedWhere(s, f) { return LIST.filter(function (d) { return s.owned[d.id] && f(d); }).length; }
    function stat(s, k) { return (s.stats && s.stats[k]) || 0; }
    var BADGES = [
        ['own5',     '🧸', 'Collector',      'Own 5 Darkys',                         25,  function (s) { return [Object.keys(s.owned).length, 5]; }],
        ['own25',    '🗃️', 'Hoarder',        'Own 25 Darkys',                        75,  function (s) { return [Object.keys(s.owned).length, 25]; }],
        ['own100',   '🏛️', 'Museum',         'Own 100 Darkys',                       250, function (s) { return [Object.keys(s.owned).length, 100]; }],
        ['rare',     '💎', 'Rare Find',      'Get a Rare Darky',                     30,  function (s) { return [ownedWhere(s, function (d) { return d.r === 'rare'; }), 1]; }],
        ['epic',     '🔮', 'Epic Moment',    'Get an Epic Darky',                    60,  function (s) { return [ownedWhere(s, function (d) { return d.r === 'epic'; }), 1]; }],
        ['legend',   '👑', 'Legend',         'Get a Legendary Darky',                100, function (s) { return [ownedWhere(s, function (d) { return d.r === 'legendary'; }), 1]; }],
        ['chroma',   '🌈', 'Glowing',        'Get a Chroma Darky',                   200, function (s) { return [ownedWhere(s, function (d) { return d.chroma; }), 1]; }],
        ['season',   '❄️', 'Season Pass',    'Own all 7 Darkys of one season',       150, function (s) {
            return [Math.max.apply(null, ['winter', 'spring', 'summer', 'autumn'].map(function (k) { return ownedWhere(s, function (d) { return d.season === k; }); })), 7]; }],
        ['holiday',  '🎉', 'Holiday Spirit', 'Get a Holiday Darky',                  100, function (s) { return [ownedWhere(s, function (d) { return d.event; }), 1]; }],
        ['travel',   '🌍', 'World Traveler', 'Get 10 Holiday Darkys',                300, function (s) { return [ownedWhere(s, function (d) { return d.event; }), 10]; }],
        ['faith',    '🕊️', 'Faithful',       'Collect every religious holiday Darky', 300, function (s) { return [ownedWhere(s, function (d) { return d.holy; }), LIST.filter(function (d) { return d.holy; }).length]; }],
        ['theme',    '🧭', 'Explorer',       'Collect every Darky of one Theme Pack', 200, function (s) {
            return [Math.max.apply(null, THEME_ORDER.map(function (k) {
                return ownedWhere(s, function (d) { return d.theme === k; }) / THEMES[k].list.length;
            })) === 1 ? 1 : 0, 1]; }],
        ['mystic',   '✨', 'Mystic',         'Own Etermaximus',                      300, function (s) { return [s.owned.etermaximus ? 1 : 0, 1]; }],
        ['unique',   '🎨', 'One of a Kind',  'Own a Unique Darky',                   300, function (s) { return [ownedWhere(s, function (d) { return d.unique; }), 1]; }],
        ['game1',    '🎮', 'First Game',     'Play an Arcade game',                20,  function (s) { return [stat(s, 'games'), 1]; }],
        ['game25',   '🕹️', 'Regular',        'Play 25 Arcade games',              100, function (s) { return [stat(s, 'games'), 25]; }],
        ['win1',     '🥇', 'Champion',       'Win an Arcade game',                 50,  function (s) { return [stat(s, 'wins'), 1]; }],
        ['win10',    '🏆', 'Unstoppable',    'Win 10 Arcade games',               200, function (s) { return [stat(s, 'wins'), 10]; }],
        ['right100', '🧠', 'Brainiac',       'Answer 100 questions right',           100, function (s) { return [stat(s, 'correct'), 100]; }],
        ['gold1k',   '💰', 'Gold Rush',      'Get 1,000 gold in one game',           150, function (s) { return [stat(s, 'bestGold'), 1000]; }],
        ['box100',   '📦', 'Unboxer',        'Open 100 boxes or packs',              50,  function (s) { return [stat(s, 'boxes'), 100]; }],
        ['box1m',    '🏭', 'Box Tycoon',     'Open 1,000,000 boxes or packs',        500, function (s) { return [stat(s, 'boxes'), 1000000]; }],
        ['streak7',  '🔥', 'Loyal',          'Reach a 7-day streak',                 150, function (s) { return [stat(s, 'bestStreak'), 7]; }],
        ['quest10',  '📜', 'Quest Master',   'Finish 10 daily quests',               150, function (s) { return [stat(s, 'quests'), 10]; }]
    ];
    function badges() {
        var s = load();
        s.badges = s.badges || {};
        return BADGES.map(function (b) {
            var hg = b[5](s), have = Math.min(hg[0], hg[1]);
            return { id: b[0], icon: b[1], name: b[2], text: b[3], reward: b[4], have: have, goal: hg[1],
                ready: have >= hg[1], claimed: !!s.badges[b[0]] };
        });
    }
    function claimBadge(id) {
        var s = load(), b = badges().filter(function (x) { return x.id === id; })[0];
        if (!b || !b.ready || b.claimed) return 0;
        s.badges[id] = true;
        s.tokens += b.reward;
        save();
        return b.reward;
    }

    // Trading
    // -------
    // No server, so a trade is a gift code: the sender gives up one copy of a
    // Darky and gets a code; whoever enters the code gets that Darky. Each
    // device can use a code once. Sending the code back to yourself undoes it.
    function giftCheck(id, nonce) { return ('0000' + hash(id + '|' + nonce + '|darkyplay-gift').toString(36)).slice(-5); }
    function giftable() {
        var s = load();
        return LIST.filter(function (d) { return s.owned[d.id] && d.id !== 'darky'; });
    }
    function giftCreate(id) {
        var s = load(), d = BY_ID[id];
        if (!d || id === 'darky' || !s.owned[id]) return { error: 'You don\'t have that Darky' };
        var nonce = '';
        for (var i = 0; i < 6; i++) nonce += 'abcdefghjkmnpqrstuvwxyz23456789'[Math.floor(Math.random() * 31)];
        var code = id + '-' + nonce + '-' + giftCheck(id, nonce);
        s.owned[id]--;
        if (!s.owned[id]) { delete s.owned[id]; if (s.selected === id) s.selected = 'darky'; }
        s.sent = (s.sent || []).concat([{ code: code, id: id, at: Date.now() }]).slice(-10);
        save();
        return { code: code, darky: d };
    }
    function giftRedeem(code) {
        var s = load(), c = String(code || '').trim().toLowerCase().replace(/^.*[?&]gift=/, '');
        var parts = c.split('-');
        if (parts.length < 3) return { error: 'That code doesn\'t look right' };
        var check = parts.pop(), nonce = parts.pop(), id = parts.join('-'), d = BY_ID[id];
        if (!d || giftCheck(id, nonce) !== check) return { error: 'That code doesn\'t work' };
        s.redeemed = s.redeemed || {};
        if (s.redeemed[c]) return { error: 'This code was already used here' };
        s.redeemed[c] = 1;
        var isNew = !s.owned[id];
        s.owned[id] = (s.owned[id] || 0) + 1;
        save();
        return { darky: d, isNew: isNew };
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
        spendAll: function (boxId) { return openMany(boxId || 'dark', 1, true); },
        SEASONS: SEASONS,
        THEMES: THEMES,
        THEME_ORDER: THEME_ORDER,
        // A box opened for free, as a game prize (the Darky Fish in Fishing Frenzy).
        bonusOpen: function (boxId) {
            var box = BOXES[boxId];
            if (!box || box.season) return null;
            load().tokens += box.cost;
            return open(boxId);
        },
        seasonOpen: seasonOpen,
        nextOpen: nextOpen,
        isOwner: isOwner,
        chromaYear: chromaYear,
        chromasOf: chromasOf,
        CHROMA_FIRST: CHROMA_FIRST,
        CHROMA_LAST: CHROMA_LAST,
        setChromaYear: function (y) {
            if (!isOwner()) return;
            load().ownerYear = +y; save();
        },
        EVENTS: EVENTS,
        EVENT_COST: EVENT_COST,
        eventNow: eventNow,
        buyEvent: buyEvent,
        quests: todaysQuests,
        badges: badges,
        giftable: giftable,
        giftCreate: giftCreate,
        giftRedeem: giftRedeem,
        giftsSent: function () { return (load().sent || []).slice().reverse(); },
        claimBadge: claimBadge,
        claimQuest: claimQuest,
        streak: streakInfo,
        claimStreak: claimStreak,
        // Arcade games (Gold Quiz, Fishing Frenzy) report a finished game here.
        gameDone: function (o) {
            var s = load();
            bump(s, 'games', 1);
            bump(s, 'correct', o.right || 0);
            bump(s, 'bestGold', o.gold || 0);
            if (o.place === 1) bump(s, 'wins', 1);
            save();
        }
    };

    // Another tab saved: drop this tab's copy so it never writes old numbers back.
    try {
        window.addEventListener('storage', function (e) { if (e.key === KEY) mem = null; });
    } catch (e) { /* no window */ }
})();
