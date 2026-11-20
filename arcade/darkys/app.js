(function () {
'use strict';
// Each page (Darkys, Market, Quests, Trade, Badges) only has some of the
// sections. A missing element gets a throwaway stand-in, so the shared code
// can run on every page.
var $ = function (id) { return document.getElementById(id) || document.createElement('div'); };
var has = function (id) { return !!document.getElementById(id); };
var R = Darkys.RARITY;
var last = null;

function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

function isMys(d) { return d.r === 'mystical' || d.r === 'chroma' || d.r === 'mystichroma'; }
function rrClass(d) { return 'rr' + (d.r === 'mystichroma' ? ' umcr' : isMys(d) ? ' mysr' : ''); }

function timeLeft(ms) {
  var h = Math.floor(ms / 3600000), m = Math.ceil((ms % 3600000) / 60000);
  if (m === 60) { h++; m = 0; }
  return h ? h + 'h ' + m + 'm' : m + 'm';
}

var T = Darkys.tournament;
var ETER = Darkys.get('etermaximus');

function bigTime(ms) {
  var d = Math.floor(ms / 86400000);
  return (d ? d + 'd ' : '') + timeLeft(ms % 86400000 || 60000);
}

function renderTournament() {
  var st = T.state(), rows = T.standings(), rank = T.rank(), best = T.best();
  var msg, left = '';
  if (st === 'soon') {
    msg = 'Starts soon! Finish in the top ' + T.PRIZE_RANK + ' to win Etermaximus.';
    left = 'STARTS IN ' + bigTime(T.START - Date.now());
  } else if (st === 'live') {
    msg = 'Your best Gold Quiz score counts. Be in the top ' + T.PRIZE_RANK + ' when the 5 minutes are up to win Etermaximus! The others keep playing, so keep climbing.';
    left = 'ENDS IN ' + bigTime(T.endsIn()) + '  ·  YOUR BEST ' + best + '  ·  RANK #' + rank;
  } else {
    msg = Darkys.marketUnlocked()
      ? 'You finished #' + rank + '. Etermaximus is yours: claim it in the Market!'
      : 'The tournament is over.' + (best ? ' You finished #' + rank + '.' : '');
    left = 'FINAL RESULTS  ·  PRIZES: #1 1,000,000,000 🎟️  ·  #2-3 10,000 🎟️';
  }
  $('tourMsg').textContent = msg;
  $('tourLeft').textContent = left;

  var host = $('tourRows');
  host.innerHTML = '';
  function row(r) {
    var d = document.createElement('div');
    d.className = 'trow' + (r.rank <= T.PRIZE_RANK ? ' win' : '') + (r.me ? ' me' : '');
    d.innerHTML = '<span class="rk">#' + r.rank + '</span><span class="nm">' + esc(r.name) + (r.me ? ' (you)' : '') +
      (r.rank <= T.PRIZE_RANK ? ' 🔮' : '') + '</span><span class="sc">' + r.score + '</span>';
    host.appendChild(d);
  }
  rows.slice(0, 8).forEach(function (r) {
    row(r);
    if (r.rank === T.PRIZE_RANK) {
      var l = document.createElement('div');
      l.className = 'tline';
      l.innerHTML = '<span>TOP ' + T.PRIZE_RANK + ' WIN ETERMAXIMUS</span>';
      host.appendChild(l);
    }
  });
  if (rank > 8) {
    var dots = document.createElement('div');
    dots.className = 'tdots'; dots.textContent = '...';
    host.appendChild(dots);
    row(rows[rank - 1]);
  }
}

function renderMarket() {
  var m = $('market'), r = R[ETER.r];
  var owned = Darkys.owns(ETER.id), unlocked = Darkys.marketUnlocked(), over = T.state() === 'over';
  if (owned || unlocked) {
    m.innerHTML = '<div class="big mys" style="box-shadow:0 0 30px ' + r.color + '">' + ETER.em + '</div>' +
      '<div><div class="nm">' + esc(ETER.name) + '</div><div class="rr mysr" style="color:' + r.color + '">MYSTICAL · ONLY 1</div>' +
      '<div class="why">' + (owned ? 'You own the rarest Darky on Darky Play.' : 'You won it in the tournament!') + '</div>' +
      (owned ? '' : '<button class="buy" id="claimBtn">CLAIM ETERMAXIMUS</button>') + '</div>';
    if (!owned) $('claimBtn').onclick = function () {
      var d = Darkys.claimMarket(ETER.id);
      if (!d) return;
      last = d;
      $('equipBtn').style.display = '';
      $('shake').style.display = 'none';
      $('prize').innerHTML = '<div class="new" style="color:#ff5cf0">✨ MYSTICAL! ✨</div>' +
        '<div class="em mys" style="box-shadow:0 0 90px ' + r.color + '">' + d.em + '</div>' +
        '<div class="nm">' + esc(d.name) + '</div><div class="rr mysr" style="color:' + r.color + '">MYSTICAL</div>';
      $('prize').className = 'prize on';
      $('rbtns').className = 'rbtns on';
      $('reveal').className = 'reveal on';
      render();
    };
  } else {
    m.innerHTML = '<div class="big locked">🔒</div>' +
      '<div><div class="nm">???</div><div class="rr mysr" style="color:' + r.color + '">MYSTICAL · LOCKED</div>' +
      '<div class="why">' + (over
        ? 'Only the top ' + T.PRIZE_RANK + ' of the tournament could unlock this one.'
        : 'Not for sale. Finish in the top ' + T.PRIZE_RANK + ' of the Etermaximus Tournament to unlock it.') +
      '</div></div>';
  }
}

function render() {
  var won = Darkys.claimPrize();
  if (won) showPrize(won);
  $('tokens').textContent = Darkys.tokens().toLocaleString('en-US');

  renderMarket();
  var unlocked = Darkys.marketUnlocked(), over = T.state() === 'over';

  var me = Darkys.selected(), r = R[me.r];
  $('me').innerHTML = '<div class="big' + (isMys(me) ? ' mys' : '') + '" style="border-color:' + r.color + '">' + me.em + '</div>' +
    '<div><div class="nm">' + esc(me.name) + '</div><div class="' + rrClass(me) + '" style="color:' + r.color + '">' + r.name.toUpperCase() +
    '</div><div class="hint">Tap a Darky below to play as it.</div></div>';

  var wait = Darkys.freeReadyIn();
  $('freeBtn').disabled = wait > 0;
  $('freeBtn').textContent = wait > 0 ? 'IN ' + timeLeft(wait) : 'OPEN FREE';
  $('darkBtn').disabled = Darkys.tokens() < Darkys.BOXES.dark.cost;
  $('allBtn').disabled = Darkys.tokens() < Darkys.BOXES.dark.cost;
  if (armedBox !== 'dark') $('allBtn').textContent = 'SPEND ALL 🎟️ ' + Darkys.tokens().toLocaleString('en-US');
  [].forEach.call($('packs').children, function (b) {
    b.disabled = Darkys.tokens() < Darkys.BOXES.dark.cost * +b.dataset.n;
  });

  var grid = $('grid');
  grid.innerHTML = '';
  var have = 0;
  var shown = 0;
  Darkys.LIST.forEach(function (d) {
    var owned = Darkys.owns(d.id), rr = R[d.r];
    if ((d.chroma || d.event || d.daily !== undefined) && !owned) return;      // Chromas and holiday Darkys stay secret until you get one
    shown++;
    var gone = !owned && d.market && over && !unlocked;
    if (owned) have++;
    var c = document.createElement(owned ? 'button' : 'div');
    c.className = 'card' + (owned ? '' : ' lock') + (gone ? ' gone' : '') + (owned && me.id === d.id ? ' on' : '') + (isMys(d) ? ' mys' : '');
    c.style.borderColor = rr.color;
    c.innerHTML = (owned && Darkys.count(d.id) > 1 ? '<span class="ct">x' + Darkys.count(d.id) + '</span>' : '') +
      '<span class="em">' + d.em + '</span><span class="nm">' + (owned ? esc(d.name) : '???') + '</span>' +
      '<span class="' + rrClass(d) + '" style="color:' + rr.color + '">' + (gone ? 'LOCKED' : rr.name.toUpperCase()) + '</span>';
    if (owned) c.onclick = function () { Darkys.select(d.id); render(); };
    grid.appendChild(c);
  });
  $('count').textContent = have + '/' + shown;
  renderSeasons();
  renderThemes();
  renderDayPack();
  renderEvent();
  renderHoly();
  renderDaily();
  renderBadges();
  renderTrade();
  renderTabs();
}

function renderTabs() {
  var q = Darkys.quests().filter(function (x) { return x.ready && !x.claimed; }).length + (Darkys.streak().claimedToday ? 0 : 1);
  var b = Darkys.badges().filter(function (x) { return x.ready && !x.claimed; }).length;
  [['tabQuests', q], ['tabBadges', b]].forEach(function (t) {
    var el = document.getElementById(t[0]);
    if (!el) return;
    var dot = el.querySelector('.dot');
    if (t[1] && !dot) { dot = document.createElement('span'); dot.className = 'dot'; el.appendChild(dot); }
    if (dot) { if (t[1]) dot.textContent = t[1]; else dot.remove(); }
  });
}

function toast(t) {
  var el = $('toast');
  el.textContent = t; el.style.display = 'block';
  clearTimeout(toast.t); toast.t = setTimeout(function () { el.style.display = 'none'; }, 2200);
}

var PACKS = [10, 50, 100, 1000];
PACKS.forEach(function (n) {
  var b = document.createElement('button');
  b.className = 'buy';
  b.dataset.n = n;
  b.innerHTML = '<b>×' + n + '</b>🎟️ ' + (Darkys.BOXES.dark.cost * n).toLocaleString('en-US');
  b.onclick = function () { openPack('dark', n); };
  $('packs').appendChild(b);
});

function hideSummary() {
  $('sum').className = 'sum';
  $('sumHead').className = 'sumhead';
}

function openPack(boxId, n, all) {
  var box = Darkys.BOXES[boxId];
  if (Darkys.tokens() < box.cost * (all ? 1 : n)) { toast('Not enough tokens'); render(); return; }
  last = null;
  hideSummary();
  $('equipBtn').style.display = 'none';
  $('shake').textContent = box.icon;
  $('shake').style.display = '';
  $('prize').className = 'prize';
  $('rbtns').className = 'rbtns';
  $('reveal').className = 'reveal on';
  if (window.gtag) gtag('event', 'darkys_pack', { box: boxId, size: all ? 'all' : n });
  var t0 = Date.now(), res;
  // let the box start shaking before the (possibly long) roll
  setTimeout(function () {
    res = all ? Darkys.spendAll(boxId) : Darkys.openMany(boxId, n);
    setTimeout(showPack, Math.max(0, 1400 - (Date.now() - t0)));
  }, 60);
  function showPack() {
    if (res.error) { $('reveal').className = 'reveal'; toast(res.error); render(); return; }
    $('shake').style.display = 'none';
    var best = res.list[0].darky, br = R[best.r];
    $('sumHead').innerHTML = (all ? (res.capped ? 'MAX 20,000,000 PER TAP!<br>' : 'SPENT IT ALL!<br>') : '') + 'OPENED ' + res.count.toLocaleString('en-US') + ' × ' + box.name.toUpperCase() + '<br>' +
      '<span style="color:#7dffb2">' + res.fresh + ' NEW</span> · BEST: <span style="color:' + br.color + '">' + br.name.toUpperCase() + '</span>' +
      (res.refund ? '<br><span style="color:var(--muted)">DUPLICATES: +' + res.refund.toLocaleString('en-US') + ' 🎟️</span>' : '');
    var sum = $('sum');
    sum.innerHTML = '';
    res.list.forEach(function (g) {
      var rr = R[g.darky.r], c = document.createElement('div');
      c.className = 'card' + (isMys(g.darky) ? ' mys' : '');
      c.style.borderColor = rr.color;
      c.innerHTML = (g.isNew ? '<span class="tag">NEW</span>' : '') +
        '<span class="ct">x' + g.count.toLocaleString('en-US') + '</span><span class="em">' + g.darky.em + '</span>' +
        '<span class="nm">' + esc(g.darky.name) + '</span><span class="' + rrClass(g.darky) + '" style="color:' + rr.color + '">' + rr.name.toUpperCase() + '</span>';
      sum.appendChild(c);
    });
    $('sumHead').className = 'sumhead on';
    sum.className = 'sum on';
    $('rbtns').className = 'rbtns on';
    render();
  }
}

// Spend All: two taps, so nobody spends everything by accident.
var allArmed = 0, armedBox = '';
function spendAllTap(boxId, btn) {
  if (armedBox !== boxId || Date.now() - allArmed > 3000) {
    allArmed = Date.now(); armedBox = boxId;
    btn.textContent = 'SURE? TAP AGAIN';
    setTimeout(function () { allArmed = 0; armedBox = ''; render(); }, 3000);
    return;
  }
  allArmed = 0; armedBox = '';
  openPack(boxId, 0, true);
}
$('allBtn').onclick = function () { spendAllTap('dark', $('allBtn')); };

// ---------- seasonal packs ----------
var SEAS_ORDER = ['winter', 'spring', 'summer', 'autumn'];
var MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
function buildSeasons() {
  var host = $('seas');
  SEAS_ORDER.forEach(function (id) {
    var S = Darkys.SEASONS[id], c = document.createElement('div');
    c.className = 'crate';
    c.id = 'sp-' + id;
    c.innerHTML = '<div class="ic">' + S.icon + '</div><div class="nm">' + S.name.toUpperCase() + '</div>' +
      '<div class="st"></div>' +
      '<button class="buy one">OPEN 1 · 🎟️ 100</button>' +
      '<div class="packs"></div>' +
      '<button class="buy allbtn">SPEND ALL</button>';
    c.querySelector('.one').onclick = function () { openBox(id); };
    [10, 50, 100, 1000].forEach(function (n) {
      var b = document.createElement('button');
      b.className = 'buy'; b.dataset.n = n;
      b.innerHTML = '<b>×' + n + '</b>';
      b.onclick = function () { openPack(id, n); };
      c.querySelector('.packs').appendChild(b);
    });
    var all = c.querySelector('.allbtn');
    all.onclick = function () { spendAllTap(id, all); };
    host.appendChild(c);
  });
  if (Darkys.isOwner()) {
    var row = $('ownerRow'), sel = document.createElement('select');
    for (var y = Darkys.CHROMA_FIRST; y <= Darkys.CHROMA_LAST; y++) {
      var o = document.createElement('option'); o.value = y; o.textContent = y; sel.appendChild(o);
    }
    sel.value = Darkys.chromaYear();
    sel.onchange = function () { Darkys.setChromaYear(sel.value); render(); };
    row.innerHTML = '<span>👑 OWNER · ALL PACKS OPEN · CHROMA YEAR</span>';
    row.appendChild(sel);
    row.style.display = '';
  }
}
function renderSeasons() {
  if (!has('seas')) return;
  var y = Darkys.chromaYear(), ch = Darkys.chromasOf(y), t = Darkys.tokens();
  $('seasInfo').innerHTML = 'Each pack opens for <b>one day</b>: the first day of its season. Inside: Darkys you can only get from that season, ' +
    'and a tiny chance of a <b>Chroma</b>, a glowing Darky.' +
    (ch.length ? '<br>' + y + ' Chromas: <b>' + ch.length + '</b> to find' : '');
  SEAS_ORDER.forEach(function (id) {
    var c = $('sp-' + id), open = Darkys.seasonOpen(id);
    c.className = 'crate ' + (open ? 'open' : 'shut');
    var d = Darkys.nextOpen(id);
    c.querySelector('.st').innerHTML = open
      ? '<span class="opent">' + (Darkys.isOwner() ? 'OPEN (OWNER)' : 'OPEN TODAY ONLY!') + '</span>'
      : '<span class="lockt">🔒 LOCKED<br>OPENS ' + MONTHS[d.getMonth()] + ' 1, ' + d.getFullYear() + '</span>';
    [].forEach.call(c.querySelectorAll('.buy'), function (b) { b.style.display = open ? '' : 'none'; });
    c.querySelector('.one').disabled = t < 100;
    [].forEach.call(c.querySelectorAll('.packs .buy'), function (b) { b.disabled = t < 100 * +b.dataset.n; });
    var all = c.querySelector('.allbtn');
    all.disabled = t < 100;
    if (armedBox !== id) all.textContent = 'SPEND ALL';
  });
}
buildSeasons();

// ---------- theme packs ----------
function oddsText(o) {
  return Object.keys(o).map(function (r) { return R[r].name; }).join(' · ');
}
function buildThemes() {
  var host = $('themes');
  Darkys.THEME_ORDER.forEach(function (id) {
    var T = Darkys.THEMES[id], c = document.createElement('div');
    c.className = 'crate';
    c.id = 'tp-' + id;
    c.innerHTML = '<div class="ic">' + T.icon + '</div><div class="nm">' + T.name.toUpperCase() + '</div>' +
      '<div class="ab">' + esc(T.about) + '</div>' +
      '<div class="odds">' + oddsText(T.odds) + '</div>' +
      '<div class="got"></div>' +
      '<button class="buy one">OPEN 1 · 🎟️ ' + T.cost + '</button>' +
      '<div class="packs"></div>' +
      '<button class="buy allbtn">SPEND ALL</button>';
    c.querySelector('.one').onclick = function () { openBox(id); };
    [10, 50, 100, 1000].forEach(function (n) {
      var b = document.createElement('button');
      b.className = 'buy'; b.dataset.n = n;
      b.innerHTML = '<b>×' + n + '</b>🎟️ ' + (T.cost * n).toLocaleString('en-US');
      b.onclick = function () { openPack(id, n); };
      c.querySelector('.packs').appendChild(b);
    });
    var all = c.querySelector('.allbtn');
    all.onclick = function () { spendAllTap(id, all); };
    host.appendChild(c);
  });
}
function renderThemes() {
  if (!has('themes')) return;
  var t = Darkys.tokens();
  Darkys.THEME_ORDER.forEach(function (id) {
    var T = Darkys.THEMES[id], c = $('tp-' + id), have = 0;
    Darkys.LIST.forEach(function (d) { if (d.theme === id && Darkys.owns(d.id)) have++; });
    c.className = 'crate' + (have === T.list.length ? ' done' : '');
    c.querySelector('.got').textContent = (have === T.list.length ? '✓ ' : '') + have + ' / ' + T.list.length + ' COLLECTED';
    c.querySelector('.one').disabled = t < T.cost;
    [].forEach.call(c.querySelectorAll('.packs .buy'), function (b) { b.disabled = t < T.cost * +b.dataset.n; });
    var all = c.querySelector('.allbtn');
    all.disabled = t < T.cost;
    if (armedBox !== id) all.textContent = 'SPEND ALL';
  });
}
buildThemes();

// ---------- Pack of the Day (Market) ----------
function buildDayPack() {
  if (!has('market') || !Darkys.DAILY) return;
  var css = document.createElement('style');
  css.textContent = '.daybox{border-color:#7ee8ff!important;box-shadow:0 0 22px rgba(126,232,255,.18)}' +
    '.day{display:flex;gap:18px;align-items:flex-start;flex-wrap:wrap}' +
    '.day .crate{flex:none;width:min(280px,100%);border-color:#7ee8ff}' +
    '.day .info{flex:1;min-width:240px;color:var(--muted);font-size:14px;line-height:1.5}' +
    '.day .info b{color:#7ee8ff}' +
    '.dstrip{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin:10px 0}' +
    '.dstrip div{background:var(--panel2);border:2px solid #3a3660;border-radius:10px;padding:6px 2px;text-align:center;font-size:30px;line-height:1.1}' +
    '.dstrip div small{display:block;font-family:"Press Start 2P",monospace;font-size:6px;margin-top:4px;line-height:1.4}' +
    '.dstrip div.no{filter:brightness(0) opacity(.35)}' +
    '.dayown{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px;font-family:"Press Start 2P",monospace;font-size:9px;color:var(--gold)}' +
    '.dayown select{font-family:inherit;font-size:10px;background:var(--panel2);color:#fff;border:2px solid var(--gold);border-radius:8px;padding:6px;max-width:100%}';
  document.head.appendChild(css);
  var box = document.createElement('div');
  box.className = 'box daybox';
  box.id = 'dayPack';
  box.innerHTML = '<h2><span>📅 PACK OF THE DAY</span><span id="dayLeft"></span></h2>' +
    '<div class="day"><div class="crate"><div class="ic" id="dayIc"></div><div class="nm" id="dayNm"></div>' +
    '<div class="odds">10 Darkys · Common to Legendary<br>Only today!</div>' +
    '<button class="buy" id="dayBtn">OPEN 1 · 🎟️ ' + Darkys.DAILY_COST + '</button>' +
    '<div class="packs" id="dayPacks"></div><button class="buy allbtn" id="dayAll">SPEND ALL</button></div>' +
    '<div class="info"><div id="dayInfo"></div><div class="dstrip" id="dayStrip"></div><div id="dayNext"></div>' +
    '<div class="dayown" id="dayOwner" style="display:none"></div></div></div>';
  var wrap = document.querySelector('.wrap');
  wrap.insertBefore(box, wrap.firstChild);
  $('dayBtn').onclick = function () { openBox('daily'); };
  [10, 50, 100, 1000].forEach(function (n) {
    var b = document.createElement('button');
    b.className = 'buy'; b.dataset.n = n;
    b.innerHTML = '<b>×' + n + '</b>🎟️ ' + (Darkys.DAILY_COST * n).toLocaleString('en-US');
    b.onclick = function () { openPack('daily', n); };
    $('dayPacks').appendChild(b);
  });
  $('dayAll').onclick = function () { spendAllTap('daily', $('dayAll')); };
  if (Darkys.isOwner()) {
    var sel = document.createElement('select');
    sel.innerHTML = '<option value="">Today</option>' + Darkys.DAILY.map(function (P) {
      var d = new Date(2026, 0, 1 + P.i);
      return '<option value="' + P.i + '">' + MON[d.getMonth()] + ' ' + d.getDate() + ' · ' + P.icon + ' ' + esc(P.name) + '</option>';
    }).join('');
    sel.value = Darkys.dailyToday() === Darkys.dayOfYear() ? '' : Darkys.dailyToday();
    sel.onchange = function () { Darkys.setOwnerDay(sel.value); render(); };
    $('dayOwner').innerHTML = '<span>👑 OWNER · OPEN ANY DAY</span>';
    $('dayOwner').appendChild(sel);
    $('dayOwner').style.display = '';
  }
}
function renderDayPack() {
  if (!has('dayPack')) return;
  var i = Darkys.dailyToday(), P = Darkys.DAILY[i], t = Darkys.tokens(), have = 0, strip = '';
  for (var j = 0; j < 10; j++) {
    var d = Darkys.get('day' + i + '-' + j), own = Darkys.owns(d.id);
    if (own) have++;
    strip += '<div class="' + (own ? '' : 'no') + '" title="' + esc(own ? d.name : '???') + '">' + d.em +
      '<small style="color:' + R[d.r].color + '">' + (own ? esc(d.name.split(' ').pop()).toUpperCase() : '???') + '</small></div>';
  }
  $('dayIc').innerHTML = P.icon;
  $('dayNm').textContent = P.name.toUpperCase() + ' PACK';
  $('dayInfo').innerHTML = 'A different pack every day of the year. Today: <b>' + esc(P.name) + '</b>, comes back on this day next year. ' +
    '<b>' + have + ' / 10</b> collected.';
  $('dayStrip').innerHTML = strip;
  var nx = Darkys.DAILY[(Darkys.dayOfYear() + 1) % Darkys.DAILY.length];
  $('dayNext').innerHTML = 'Tomorrow: ' + nx.icon + ' <b>' + esc(nx.name) + '</b>';
  var now = new Date(), mid = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  $('dayLeft').textContent = 'ENDS IN ' + timeLeft(mid - now);
  $('dayBtn').disabled = t < Darkys.DAILY_COST;
  [].forEach.call($('dayPacks').children, function (b) { b.disabled = t < Darkys.DAILY_COST * +b.dataset.n; });
  $('dayAll').disabled = t < Darkys.DAILY_COST;
  if (armedBox !== 'daily') $('dayAll').textContent = 'SPEND ALL';
}

// ---------- daily quests and streak ----------
function reward(n, what) {
  last = null;
  hideSummary();
  $('shake').style.display = 'none';
  $('equipBtn').style.display = 'none';
  $('prize').innerHTML = '<div class="new">' + what + '</div>' +
    '<div class="em" style="border-color:#7dffb2;box-shadow:0 0 60px #7dffb2">🎟️</div>' +
    '<div class="nm">+' + n.toLocaleString('en-US') + ' tokens</div>';
  $('prize').className = 'prize on';
  $('rbtns').className = 'rbtns on';
  $('reveal').className = 'reveal on';
  render();
}
function renderDaily() {
  var st = Darkys.streak(), cur = (st.day - 1) % st.table.length;
  var h = '<div class="days">' + st.table.map(function (t, i) {
    var cls = i < cur || (i === cur && st.claimedToday) ? ' got' : i === cur ? ' now' : '';
    return '<div class="d' + cls + '">DAY ' + (i + 1) + '<b>' + t + '</b></div>';
  }).join('') + '</div>';
  h += st.claimedToday
    ? '<span class="pixel" style="font-size:9px;color:#7dffb2">✓ DAY ' + st.day + ' CLAIMED · COME BACK TOMORROW</span>'
    : '<button class="buy" id="streakBtn">CLAIM DAY ' + st.day + ' · 🎟️ ' + st.reward + '</button>';
  $('streak').innerHTML = h;
  if (!st.claimedToday) $('streakBtn').onclick = function () {
    var n = Darkys.claimStreak();
    if (n) reward(n, '📅 DAY ' + st.day + ' STREAK!');
  };
  var qs = Darkys.quests(), host = $('quests');
  host.innerHTML = '';
  qs.forEach(function (q) {
    var d = document.createElement('div');
    d.className = 'quest' + (q.claimed ? ' claimed' : '');
    d.innerHTML = '<div class="qt">' + esc(q.text) + '<div class="bar"><i style="width:' + Math.round(q.have / q.goal * 100) + '%"></i></div>' +
      '<div class="qn">' + q.have + ' / ' + q.goal + '  ·  🎟️ ' + q.reward + '</div></div>' +
      (q.claimed ? '<span class="pixel" style="font-size:9px;color:#7dffb2">✓ DONE</span>'
        : q.ready ? '<button class="buy">CLAIM 🎟️ ' + q.reward + '</button>'
        : '<a class="buy" style="text-decoration:none;text-align:center;background:#3a3660;color:#fff;box-shadow:none" href="' +
          (/faith/i.test(q.text) ? '../market/#faith' : /box|pack/i.test(q.text) ? '../market/#boxes' : /gold/i.test(q.text) ? '../gold-quiz/' : '../') + '">' + (/box|pack/i.test(q.text) ? 'OPEN' : 'PLAY') + '</a>');
    var b = d.querySelector('button');
    if (b) b.onclick = function () { var n = Darkys.claimQuest(q.id); if (n) reward(n, '✅ QUEST DONE!'); };
    host.appendChild(d);
  });
  var now = new Date(), mid = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  $('dailyLeft').textContent = 'NEW QUESTS IN ' + timeLeft(mid - now);
}

// ---------- trading ----------
var giftArmed = 0;
function giftLink(code) { return location.origin + location.pathname + '?gift=' + encodeURIComponent(code); }
function renderTrade() {
  var sel = $('giftPick'), keep = sel.value, list = Darkys.giftable();
  list.sort(function (a, b) { return a.name.localeCompare(b.name); });
  sel.innerHTML = list.length ? list.map(function (d) {
    return '<option value="' + d.id + '">' + esc(d.name) + ' · ' + R[d.r].name + (Darkys.count(d.id) > 1 ? ' (x' + Darkys.count(d.id) + ')' : '') + '</option>';
  }).join('') : '<option value="">No Darkys to send yet</option>';
  if (keep && list.some(function (d) { return d.id === keep; })) sel.value = keep;
  $('giftBtn').disabled = !list.length;
  if (!giftArmed) $('giftBtn').textContent = 'CREATE GIFT CODE';
  var sent = Darkys.giftsSent();
  $('giftSent').innerHTML = sent.length ? '<b>Your codes:</b>' + sent.slice(0, 5).map(function (g) {
    var d = Darkys.get(g.id); return '<div>' + (d ? esc(d.name) : g.id) + ': ' + esc(g.code) + '</div>';
  }).join('') : '';
}
$('giftBtn').onclick = function () {
  var id = $('giftPick').value;
  if (!id) return;
  if (Date.now() - giftArmed > 3000) {
    giftArmed = Date.now();
    $('giftBtn').textContent = 'SURE? IT LEAVES YOUR COLLECTION';
    setTimeout(function () { giftArmed = 0; render(); }, 3000);
    return;
  }
  giftArmed = 0;
  var res = Darkys.giftCreate(id);
  if (res.error) { toast(res.error); render(); return; }
  var link = giftLink(res.code);
  $('giftOut').innerHTML = '<div class="code" id="giftCode">' + esc(res.code) + '</div>' +
    '<div class="row" style="margin-top:8px"><button class="buy" id="cpCode">COPY CODE</button><button class="buy" id="cpLink">COPY LINK</button></div>';
  function copy(t) {
    try { navigator.clipboard.writeText(t).then(function () { toast('Copied!'); }, function () { toast('Copy it by hand'); }); }
    catch (e) { toast('Copy it by hand'); }
  }
  $('cpCode').onclick = function () { copy(res.code); };
  $('cpLink').onclick = function () { copy(link); };
  if (window.gtag) gtag('event', 'darkys_gift_create', { rarity: res.darky.r });
  render();
};
function redeem(code) {
  var res = Darkys.giftRedeem(code);
  if (res.error) { toast(res.error); return; }
  last = res.darky;
  hideSummary();
  var r = R[res.darky.r];
  $('shake').style.display = 'none';
  $('equipBtn').style.display = '';
  $('prize').innerHTML = '<div class="new">🎁 GIFT RECEIVED!</div>' +
    '<div class="em' + (isMys(res.darky) ? ' mys' : '') + '" style="border-color:' + r.color + ';box-shadow:0 0 60px ' + r.color + '">' + res.darky.em + '</div>' +
    '<div class="nm">' + esc(res.darky.name) + '</div><div class="' + rrClass(res.darky) + '" style="color:' + r.color + '">' + r.name.toUpperCase() + '</div>';
  $('prize').className = 'prize on';
  $('rbtns').className = 'rbtns on';
  $('reveal').className = 'reveal on';
  $('giftIn').value = '';
  if (window.gtag) gtag('event', 'darkys_gift_redeem', { rarity: res.darky.r });
  render();
}
$('redeemBtn').onclick = function () { redeem($('giftIn').value); };
$('giftIn').onkeydown = function (e) { if (e.key === 'Enter') redeem($('giftIn').value); };

// ---------- badges ----------
function renderBadges() {
  var list = Darkys.badges(), host = $('badges'), got = 0;
  host.innerHTML = '';
  list.sort(function (a, b) { return (b.ready && !b.claimed) - (a.ready && !a.claimed); });
  list.forEach(function (b) {
    if (b.claimed) got++;
    var d = document.createElement('div');
    d.className = 'badge' + (b.claimed ? ' done' : b.ready ? ' ready' : '');
    d.innerHTML = '<div class="bi">' + b.icon + '</div><div class="bn">' + esc(b.name) + '</div><div class="bt">' + esc(b.text) + '</div>' +
      (b.claimed ? '<div class="bq" style="color:#7dffb2">✓ EARNED</div>'
        : b.ready ? '<button class="buy">CLAIM 🎟️ ' + b.reward + '</button>'
        : '<div class="bar"><i style="width:' + Math.floor(b.have / b.goal * 100) + '%"></i></div>' +
          '<div class="bq">' + b.have.toLocaleString('en-US') + ' / ' + b.goal.toLocaleString('en-US') + ' · 🎟️ ' + b.reward + '</div>');
    var btn = d.querySelector('button');
    if (btn) btn.onclick = function () { var n = Darkys.claimBadge(b.id); if (n) reward(n, b.icon + ' ' + b.name.toUpperCase() + '!'); };
    host.appendChild(d);
  });
  $('badgeCount').textContent = got + '/' + list.length;
}

// ---------- religious holidays ----------
[10, 50, 100, 1000].forEach(function (n) {
  var b = document.createElement('button');
  b.className = 'buy'; b.dataset.n = n;
  b.innerHTML = '<b>×' + n + '</b>🎟️ ' + (50 * n).toLocaleString('en-US');
  b.onclick = function () { openPack('holy', n); };
  $('holyPacks').appendChild(b);
});
$('holyBtn').onclick = function () { openBox('holy'); };
$('holyAll').onclick = function () { spendAllTap('holy', $('holyAll')); };
function renderHoly() {
  var list = Darkys.LIST.filter(function (d) { return d.holy; }), have = 0, faiths = [];
  list.forEach(function (d) {
    if (Darkys.owns(d.id)) have++;
    var f = d.where.split(' · ')[0];
    if (faiths.indexOf(f) < 0) faiths.push(f);
  });
  $('holyInfo').innerHTML = 'A Darky for the big holidays of every faith: Ramazan and Kurban Bayramı, Christmas, Hanukkah, Diwali, Vesak and more. ' +
    'No dates, the pack is always open.<br><b>' + have + ' / ' + list.length + '</b> collected' +
    '<div class="faiths">' + faiths.map(function (f) { return '<span>' + esc(f) + '</span>'; }).join('') + '</div>';
  var t = Darkys.tokens();
  $('holyBtn').disabled = t < 50;
  [].forEach.call($('holyPacks').children, function (b) { b.disabled = t < 50 * +b.dataset.n; });
  $('holyAll').disabled = t < 50;
  if (armedBox !== 'holy') $('holyAll').textContent = 'SPEND ALL';
}

// ---------- holiday Darky ----------
var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDay(d) { return MON[d.getMonth()] + ' ' + d.getDate(); }
var evPick = '';
if (Darkys.isOwner()) {
  var esel = document.createElement('select');
  esel.innerHTML = '<option value="">Today\'s holiday</option>' + Darkys.EVENTS.map(function (d) {
    return '<option value="' + d.id + '">' + esc(d.name) + ' · ' + esc(d.where) + '</option>';
  }).join('');
  esel.onchange = function () { evPick = esel.value; render(); };
  $('evOwner').innerHTML = '<span>👑 OWNER · BUY ANY</span>';
  $('evOwner').appendChild(esel);
  $('evOwner').style.display = '';
}
function evCard(d, until) {
  var owned = Darkys.owns(d.id), r = R.mystichroma, c = document.createElement('div');
  c.className = 'ev';
  c.innerHTML = '<div class="big umc" style="box-shadow:0 0 40px ' + r.color + '">' + d.em + '</div>' +
    '<div><div class="nm">' + esc(d.name) + '</div><div class="rr umcr">MYSTICHROMA · ONLY 1</div>' +
    '<div class="where">' + esc(d.where) + '</div>' +
    '<div class="why">' + (owned ? 'You have it! It never comes back to the shop.' :
      (until ? 'On sale until ' + fmtDay(until) + '. After that it is gone until next year.' : 'Owner pick.')) + '</div>' +
    (owned ? '' : '<button class="buy">BUY · 🎟️ ' + Darkys.EVENT_COST + '</button>') + '</div>';
  var b = c.querySelector('.buy');
  if (b) {
    b.disabled = Darkys.tokens() < Darkys.EVENT_COST;
    b.onclick = function () {
      var res = Darkys.buyEvent(d.id);
      if (res.error) { toast(res.error); render(); return; }
      last = res.darky;
      hideSummary();
      $('shake').style.display = 'none';
      $('equipBtn').style.display = '';
      $('prize').innerHTML = '<div class="new" style="color:' + r.color + '">✨ MYSTICHROMA! ✨</div>' +
        '<div class="em umc" style="box-shadow:0 0 90px ' + r.color + '">' + res.darky.em + '</div>' +
        '<div class="nm">' + esc(res.darky.name) + '</div><div class="rr umcr">' + esc(res.darky.where) + '</div>';
      $('prize').className = 'prize on';
      $('rbtns').className = 'rbtns on';
      $('reveal').className = 'reveal on';
      render();
    };
  }
  return c;
}
function renderEvent() {
  var st = Darkys.eventNow(), host = $('ev');
  host.innerHTML = '';
  if (evPick) { host.appendChild(evCard(Darkys.get(evPick), null)); return; }
  if (!st.live) {
    var nx = st.next, names = nx ? nx.darkys.map(function (d) { return d.where; }) : [];
    host.innerHTML = '<div class="ev"><div class="big locked umc">🔒</div><div><div class="nm">No holiday today</div>' +
      '<div class="rr umcr">MYSTICHROMA</div>' +
      (nx ? '<div class="why">Next on ' + fmtDay(nx.start) + ': <b style="color:#fff">' + esc(names.slice(0, 3).join(', ')) + '</b>' +
        (names.length > 3 ? ' and ' + (names.length - 3) + ' more' : '') + '.</div>' : '') + '</div></div>';
    return;
  }
  var until = new Date(st.live.end.getTime() - 1);
  st.live.darkys.forEach(function (d) { host.appendChild(evCard(d, until)); });
}

function openBox(id) {
  hideSummary();
  var res = Darkys.open(id);
  if (res.error) { toast(res.error); render(); return; }
  last = res.darky;
  $('equipBtn').style.display = '';
  var r = R[res.darky.r];
  $('shake').textContent = Darkys.BOXES[id].icon;
  $('shake').style.display = '';
  $('prize').className = 'prize';
  $('rbtns').className = 'rbtns';
  $('reveal').className = 'reveal on';
  if (window.gtag) gtag('event', 'darkys_open', { box: id, rarity: res.darky.r });
  setTimeout(function () {
    $('shake').style.display = 'none';
    var mys = isMys(res.darky);
    $('prize').innerHTML = (mys ? '<div class="new" style="color:' + r.color + '">✨ ' + r.name.toUpperCase() + '! ✨</div>' : res.isNew ? '<div class="new">NEW DARKY!</div>' : '') +
      '<div class="em' + (mys ? ' mys' : '') + '" style="border-color:' + r.color + ';box-shadow:0 0 ' + (mys ? 90 : 50) + 'px ' + r.color + '">' + res.darky.em + '</div>' +
      '<div class="nm">' + esc(res.darky.name) + '</div><div class="' + rrClass(res.darky) + '" style="color:' + r.color + '">' + r.name.toUpperCase() + '</div>' +
      (res.isNew ? '' : '<div class="note">Already had it: +' + res.refund + ' 🎟️</div>');
    $('prize').className = 'prize on';
    $('rbtns').className = 'rbtns on';
    render();
  }, 1400);
}

function showPrize(n) {
  last = null;
  hideSummary();
  $('shake').style.display = 'none';
  $('prize').innerHTML = '<div class="new" style="color:#ffc83d">🏆 TOURNAMENT PRIZE 🏆</div>' +
    '<div class="em" style="border-color:#ffc83d;box-shadow:0 0 70px #ffc83d">🎟️</div>' +
    '<div class="nm">+' + n.toLocaleString('en-US') + ' tokens</div>' +
    '<div class="note">You finished #' + T.rank() + ' in the Etermaximus Tournament!</div>';
  $('prize').className = 'prize on';
  $('equipBtn').style.display = 'none';
  $('rbtns').className = 'rbtns on';
  $('reveal').className = 'reveal on';
}

$('freeBtn').onclick = function () { openBox('free'); };
$('darkBtn').onclick = function () { openBox('dark'); };
$('equipBtn').onclick = function () { if (last) Darkys.select(last.id); $('reveal').className = 'reveal'; render(); };
$('closeBtn').onclick = function () { $('reveal').className = 'reveal'; hideSummary(); render(); };

buildDayPack();
render();
setInterval(render, 60000);
// Opened from a gift link: redeem it once and clean the address.
(function () {
  var m = location.search.match(/[?&]gift=([^&]+)/);
  if (!m) return;
  history.replaceState(null, '', location.pathname);
  setTimeout(function () { redeem(decodeURIComponent(m[1])); }, 300);
})();
})();
