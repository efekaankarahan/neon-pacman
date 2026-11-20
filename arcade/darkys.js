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
    var XLOJO = 'data:image/webp;base64,UklGRnYQAABXRUJQVlA4IGoQAADwTQCdASrIAL4APmEsk0YkIqGhJ3R7yIAMCWZu3V3omzF/UF8T+WHte15+5/iH8qvlB3URsOzT+T92nzr/yH+49iXmEfrp+w3939pD9M/cx+6PqA/ZD90vdt/2fqo/qvqCfyT/P///sPv3Z9g39yvTf/dL4VP7T/yP3X9rH//50n/lu3b/Ecu4kh+3n7Xij4BHrP/X76mAL897tz5O9Zfr1/svcA/j/9h40igN/MP8T6JegR8//0PsHfzb+/GgUH8gHoOqlJ6p+IJmO9F4yGkzV02hRV9+vXmhdX5jNmySRfBf/PhwrqPW3g7U8QKFP+eRZwg/yguvyi+/Q4lBq1LESqKsf8oDoxdID8zUq+5iPHsXvk4EN7vkAkiySwaR5kVIjOwEpCxgn9Ufdu17w4SqvkgQBUcDom8Uq5myKT2mZhmvVlReGl/DpMLqFW9nl5S4ZOffgXBYXhZVTB795p8RoVk+nVwHYjtB4EoLOeOnMXXfSM8JxVwhB6heFRfg2+2OKOCY+TyrbtAjGdHvkYDWAgTQoP5yRFXzW0KEL+Ku9xO/tpoq0EOuC/fQr4C9GIUzcT8rkJeHpz++AR88gY4Vwk01ENEY9ETsN8ZRORwbBDn3qaOaVMxgYPo3gCJMb/Tasz3+9EgbZcVrx5UzC7B5u+edw9fhzpbjOe7iKEC8kOQjxfBZ9UQ7u1W1zPaxAP/MMrLZRlo/4tfuEWUMVMgvHn9e/blcCmz3DnKMde31akhgwN9WNXd1iyyUuG6pyqmuFoydOIUpM2mSjKUB0ljt8uHIqLImeQu1V17zahqgoeSObmoFUjPUYBsAIoY1+750NJGDrShQAAD++ooj+H2Km4Nm0FSsNzPZymxv8Rf/ZPSdYUUy1gUXToGOEVh0jFaqsKjN6yeFcWfqXlu2vF/7+WL+M5Rgt/Y4eOybbnHN1dfGVhq3rlCGVFMqKqZzMc3aw8I9ObfuqugmPOlOEpzCR0fhW81omobXFB6dOgAPVc/pcNIFPbRjmTJEL8XLETpu3B/CFTzjNLfan3pDzPbNOpp9K4QCyv5aT9vHvuZ0nlKv/W3gZs8f9Q72JVshCmiAFmgZ11otmjMQs/YZSUBo1r/IqmLvg3yMSF2tagB77ez5OFEaHZQ3K62cYx7TSjkmUIvLxjpuVGJTIU3aHwHAxKmdiHCHWZzKut05KdWP21noe1fx17JCxQPDkebwSePlqIQuPxSNZw5hZ/SUdBf3AhV7qY5Zag6DvaEP+W6jhgXbNV8rdiWcP9vNOC4bjOAA4auHvEJsAGISv8p64n55c8Y6AHJ50BpJksQv5kgp1a4WjwTYDzfKts5cMG09HaxDaQWZ1lXUhF/I9f85PwBSmIA5sUWJ+qU18D7xFxooFualbNyqvVwMtErO9ynAQHGpDSEXRFjXeQoL/w8B28KMSOmT03OXMtZW3AvX2Tp3zW8WkVDS/OFvH8itRB1aJ6OjIFbh2sXrNdn9GLMVPmOAXOUgg53/fWzII+ZIMy2fLea57Hq+dK1tIaTqc2TsnLEgTsitXjxyImzjYSvuvxisq/nsdh0IkYvQfw3WmJqS+e2YdqTKUvFCOqlkW9zNVSGDkK/ZNB+kVSXIt3pqRPlqHGK+pVFk9S3WgSskbvBtE/ng6HGYnJsSh8U+Y2EdrFkJG4FtNaMzHYnc1gXeJNzrCgo+Can65bYcFp+y726MVU/O3YwtFrRJ6rdxHnX89HGk7hQOwT+ARoBRlCjclqsWq0aJpWpHOggwe9icHvoKUJvD8fNua+3APRtnHTLfeCvVAU2PBJZwMt2vxMMFEJv9DqafJm4ouyVe5dsJbp9LwGV8/K32R8cuFn2BCNKM1MYNsD/GuWAzeLaB7Y7K0MNYB7FIbnQ8lbUgjQ1n6vEq2t3lTEQ5JX8cBJwh0enqdNCRjtiDLl7Gq3n9QEXg2LPs46cOlgI7zF7bNHr973dT3L9RONJdCn4wbTYMIOCuckKrCG+7rexlBYcsrauzOxxfIA/rDn23YCMs+Y+sTx8IdAfsFE1hFuPAccgd1W5G1P87pR7AUhhPFvpPR6RnXeU18lnU6bG6qd+mCOqdW0VN8PaW/yB8/eKtuXkcOSxb/6d+CWcuXURsVe0Q0M8y60DqqzIBj/suYtsW3NK2YwVfm4aDXi0i4ZNhGRolD6utvKRBJ9NSjdRX8k3Bh8ofKJ7SpgFaE39y107r1TNrLBkDE/GSa5fG9PAjmU6DM2N+dSuZyFbn9PQ67TSQrsRyL9qkQAMiL/6EO4qY2DjK08xhdgAB8pwDSELByaHfkYd6RZm168bzrJCdpaA2SBjCLKIAk0heK9dfRt65QoWa0oDG77H8qiSiLGU4lAvUI6AV86WX2EkszNsnLyp6EnYjSRJopX0ULSaoqQ2IZ+9gbdAJQLX4LNGct6ktv3FD3zLR0u96k7ww0Xl8Gb86EZBowiNLBFEZKi9fs2npTz411Up9z0hv+5p+3PmrBrhTqHzxUbmRsmuUoqsGbNfBhCFhYJcFGiJqpGcvcx5VDeUALquQSl4Vhu04fWX9VJ11lxQCPWSP/gh6mSXMui1I5IH2gSK6038XJZZ79w5Lq20xaOe1nKg23Ak0ofxF8lGNp61tXEowcqfPsHLQda57rvwu1GppPlQ/9GO35x9Pn7CdLDcxm9M/LGnev0g2U6E9kanPyLjciSO5MHXvVQb3KnV+dskdGxtvmCaRhTUIJEa3HJv9pyWEiYbsLoSgeTVG079wOk78R6SGJVv3n7hJ+H3H0jfmyd7u88dwLqCMMo1YlRmfUbRW9TTJX73oZ6Ze8Y2BxPU8NtFqE6bU4UOLvrkF6SI0I9+9aZLe6HMrQHofATIc7ujJHUuvQHwY6Yp21kfeCxNJPmSjhJcjOIYJRVRN0Cz4jniIWAev5oi+pt2icge4FFiBKD/wjLkUt01S1We1gNwuvIbjvukoiNo3cc0D3tRA3rAZONYDBDDvTU6BLvL0vl4W17N6qJSLnwCPfIroXGGHMQlWlt3PZpz7aJTMoSZMP+poks2uLRdbuS2/ipp/RI68rvRvnmQBSMqvYqQKOmoY6jMhC9UPa+kHwn8DG38Bv2j16JSnFWwL3S21zO9zEXNhihchc4/yxgLEiqRMuRPJ7we5mxEY+ASKe+oAyUUGVs3XNBYLxv04+Fc9HKH+xf5Vo2hiakV4iyx88P0pRvmCUfknBRAz0/Pnjr9AHm4po/Bq5l1gLAJxnI+HI2I14VjtYSaUpL9rTBv8Q7pUp5e0ERC1tG09DOwhbQE1L+Og/yv1ORW1vuJXWrXiu03xnSUp71hfvl8em4HfdI2cf+pXghLnztHbgEMHlJTY9TEVIti0vqmv8AhsuJ0xmcW6Vz6fJNjcJyCPyITeO7gqwHmnzCJd6niimhygqmDB6DzEJ+vOL75VmPGqks/8/MCpycNwisymNDnHxIH+lSsqUel5J02skB+ktuXM2Kn+mqav1D/O5rHT6G273uc1PcMnsBp/Apk9H/99AkrVslv73tviVz5zDggPvwli+DEtpuOu9gq94U7OW24kDM44kzOmD2YG1vqfAdsrDJdwff30yyPzyIUsSMx+La+P6EhwL7S2y11T1DPe4lY4xarHJCG/LaaqEdeRrw8m+GkrMSupNoHgv/UFAiC49L4wqn62vw82YccTij+vYC0jt4r8a/didXc9QBZekGwGYwDC8kCUNfGHvxW8av6RCeM0ujdje8YNI1/vvW1Hy9lroJws1WDnEALt6CAT41YcuDoEScYfjnqROn0gyfs/pwXzkECVum+GdoV8q/4viGUSVe3OS20N5csASZcCp7YU1lVvd5as9QNDwvCNA9Yu1iZBEw9RMU5WOD8MnKYXb6q4AVZ4jddMPCxaPjWYettopJ3mdL6QBmH0sOATS3S3Oqnjl/iN+smdIX4z2+1hrj1enoGFxJdhta1ftZmFSviVw6RNNEhlgWGu6trQ9Dc7mBBF/KU5zTCyde0fsdZ9VrasELgLRSozLIe0zj2RkyjijPHcWZmro540L2LRuNrSPPA4x0h90XKWBUFfpzCvlVhreoYs0wBvi/X9sK/SJZjgLO6MQaputc3oK7Z5InqaodRM1h1lW7CatMjoOG2M5jzeLVWy+8oFJCaeJBXQpp6Vlegef4gnxJujSJpVIEN4oGRbnYly7lBZdN2zmOyCDlcaa6e9e1dGAT3+zOYOmgOYh33cfFx0zqSA/nxaj1FzFtmNGVNM8wbxVcRfLRh4hQ50PzvPY5w7oykR6Z9DG9osf6x+JuLxmDift5xiPvYzskuduLB/E4Ru51UtIeQFtXF/m9qyJA9WHQ9YoKyLeTt2LrCZLPzrXANIThxFBpv2uG/6lQIvLpKyDXmhXDx1NLf5bH2AVTgIfMtFjwq53CSv974tfHm/Bn2jxmtT9EjE32h4uUrmczGi4ag6h2e6xgZcfWHHadWRVCurR/e7YjBcjms3YwG9MYduHwc6m4qTbewlIKm/56fz67RLafPpXSNKn6cQDa7dD0OZhinTuv2OUsup7ClIJeRlv4aD0gEyuL4d3E61uHFERzOeVnFIcV+l/aHjFozVPv4Ibuh2PqGTIJMfg2D54gtb7ZljBYmlePrD3j1868e1rzaeAWNbR/Y6vFtdZIWltC/dQDFabZU86uv8cJlM2pb+EMXBhWbdmRxqoakprLkQbA5LfoM2jXQzKWoszdePCab9aevtRfJ7psyqGDQD1A0CAt/JJE+Lw6jOvW/mh+HcdW/w5sHzj8xnD5s0L0AkL6ZjYHHS7jCxPbbO28bwBN97WjmbqYTwOV+SoTkEiv/i9OFo7rMuoa/DfVKfNYtYDbkjdktOa1ZABa8O0QAF2gq+InHle2Z1utBurqp0rp5PVAn+4yO757AeJvylLGq5vjOzIbgDQzqSbQI4uN6fcrgLYZSTwOtyCii30/f24xIEX9/+93hBWkNlHEEy8DkdQZcrxgoL/BMf5HB46VbfTyb3RFCfwx0qCICU/NwXJCTfggYMoS52B9ED9jc9JcIDzj1EkwAB1pbljTPmTzs0UiJ15k8Q/aqAI4ePU2oKSloIt/lJpih38Dy4B9u6tS6trcXGHlBR5fRDGeGcrBZ1hMwgkYfs+WT0ZJQheMBa3zNqNJHm4Zp6oER9zzohZ1Q5VzYPR2c6YNb5XtNKFsWzQXMUaYZa1UVQK48hxtPaXdClN2jYkW6J/4EZYa90/V7kZt7aBR+8BB4kqOiwFw/zY5tOYbBg6y4k2IRsLaN+CuCGbDWlvwrF3wAAJwFnzy+SfxUOAG81ZrI5QXl8h3ZOJiWvJVZXuPdEv1YBRODULN8r0eK4AKGobEl1bbIWMlI9pTvUor4NbfpX7Djni/Dr2GhHcchJ9rfiTPzl77C6UtO2bLJCPb2JOWMeW4+O7HbvIrfzzx8LGv9llCA7zbJUe7XX1pAd60yn6AP06CJo9hfO2zfXa9AhPGycLd40nAav7dmy2dvwGslCjfQ5/kDE64yHLciRo5BzQrjoFNCxuqGFesndcl7jA+ZCMHuSnSuUHFUbd/uTG1pBPqk/Oa/VxxOUfoMPJ0BG6Y8/NvFqdwQJcmbixisAAAAAAA==';
    function img(src) { return '<img class="dkimg" alt="" src="' + src + '">'; }
    try {
        var st = document.createElement('style');
        st.textContent = '.dkimg{width:1em;height:1em;object-fit:cover;vertical-align:middle;border-radius:.18em;display:inline-block}' +
            '.chroma{display:inline-block;animation:dkchroma 2.6s linear infinite}' +
            '@keyframes dkchroma{0%{filter:hue-rotate(0deg) saturate(1.6) drop-shadow(0 0 .1em #fff) drop-shadow(0 0 .22em #7dfcff)}' +
            '50%{filter:hue-rotate(180deg) saturate(1.6) drop-shadow(0 0 .14em #fff) drop-shadow(0 0 .3em #ff5cf0)}' +
            '100%{filter:hue-rotate(360deg) saturate(1.6) drop-shadow(0 0 .1em #fff) drop-shadow(0 0 .22em #7dfcff)}}';
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
        unique:    { name: 'Unique',    color: '#ff8a3d', refund: 500 }
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
        if (isOwner()) LIST.forEach(function (d) { if (d.unique && !s.owned[d.id]) s.owned[d.id] = 1; });
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
            return d.r === r && !d.market && !d.unique && !d.chroma && (box.season ? d.season === box.season : !d.season);
        });
    }

    function open(boxId) {
        var s = load(), box = BOXES[boxId];
        if (!box) return { error: 'No such box' };
        if (box.season && !seasonOpen(boxId)) return { error: 'This pack is locked today' };
        if (boxId === 'free' && freeReadyIn() > 0) return { error: 'The Free Box is not ready yet' };
        if (s.tokens < box.cost) return { error: 'Not enough tokens' };

        s.tokens -= box.cost;
        if (boxId === 'free') s.lastFree = Date.now();

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
        }
    };
})();
