/*
 * DarkyPlay analytics
 * -------------------
 * Google Analytics 4, loaded from one place so the measurement ID lives in
 * a single file rather than being pasted into fifteen pages.
 *
 * Usage - one line per page, in <head>:
 *   <script src="../shared/analytics.js?v=1"></script>
 *   (the hub is at the repo root, so it uses shared/analytics.js?v=1)
 *
 * GA4 records a page_view by itself, and every game is its own page, so the
 * "which game do people actually play" question is answered without any
 * custom events. window.gtag is left exposed for adding some later.
 */
(function () {
    'use strict';

    var ID = 'G-PVVQGHE2X3';

    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    window.gtag = gtag;

    gtag('js', new Date());

    // Darky Play is aimed at children, and Google requires child-directed
    // sites to turn the advertising features off. Google Signals builds
    // cross-device profiles from signed-in users; ad personalisation feeds
    // the ad network. Neither belongs here, and neither is needed to see
    // visitor counts.
    gtag('config', ID, {
        allow_google_signals: false,
        allow_ad_personalization_signals: false
    });

    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
    // If this fails to load - blocked by an extension, offline, whatever -
    // the queued dataLayer calls simply never flush. Nothing else breaks.
    s.onerror = function () { };
    (document.head || document.documentElement).appendChild(s);

    // Named events, for the reports where page_view alone is awkward to read.
    // Wrapped in try/catch so a blocked tag can never break a game.
    window.DarkyAnalytics = {
        event: function (name, params) {
            try { gtag('event', name, params || {}); } catch (e) { }
        }
    };
})();

/*
 * Darky Play as an app
 * --------------------
 * Every page loads this file, so the app setup lives here too: the manifest
 * and icons that let the site be installed, the service worker that makes it
 * work offline, and an "Install app" button on the home page and the Arcade.
 */
(function () {
    'use strict';
    var head = document.head || document.documentElement;
    function tag(name, attrs) {
        var el = document.createElement(name);
        for (var k in attrs) el.setAttribute(k, attrs[k]);
        head.appendChild(el);
    }
    var path = location.pathname.replace(/index\.html$/, '');
    // Two apps: everything under /arcade/ is "Darky Play Arcade", the rest is "Darky Play".
    var arcade = path.indexOf('/arcade/') === 0;
    var app = arcade
        ? { manifest: '/arcade/manifest.webmanifest', icon: '/arcade/apple-touch-icon.png', title: 'DP Arcade', name: 'Darky Play Arcade', theme: '#1a1033', setup: '/app/?arcade' }
        : { manifest: '/manifest.webmanifest', icon: '/apple-touch-icon.png', title: 'Darky Play', name: 'Darky Play', theme: '#111111', setup: '/app/' };
    if (!document.querySelector('link[rel="manifest"]')) tag('link', { rel: 'manifest', href: app.manifest });
    if (!document.querySelector('meta[name="theme-color"]')) tag('meta', { name: 'theme-color', content: app.theme });
    tag('link', { rel: 'apple-touch-icon', href: app.icon });
    tag('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' });
    tag('meta', { name: 'mobile-web-app-capable', content: 'yes' });
    tag('meta', { name: 'apple-mobile-web-app-title', content: app.title });
    tag('meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' });

    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
        window.addEventListener('load', function () {
            navigator.serviceWorker.register('/sw.js').catch(function () { });
        });
    }

    // Install banner: only on the home page and the Arcade, never over a game.
    if (path !== '/' && path !== '/arcade/') return;
    var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone;
    if (standalone) return;
    var ua = navigator.userAgent;
    var ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var mobile = ios || /android|mobile/i.test(ua);
    var forced = /[?&]install=1/.test(location.search);   // came from the /app page
    var KEY = 'darkyplayInstallHide' + (arcade ? 'Arcade' : '');
    try { if (!forced && +localStorage.getItem(KEY) > Date.now()) return; } catch (e) { }
    var prompt = null, bar = null;

    function ga(name, p) { try { gtag('event', name, p || {}); } catch (e) { } }
    function build() {
        if (bar || !document.body) return;
        var css = document.createElement('style');
        css.textContent =
            '.dp-bar{position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:9999;width:min(560px,calc(100vw - 20px));' +
            'display:flex;align-items:center;gap:12px;padding:10px 10px 10px 12px;border-radius:16px;background:#1d1b2b;color:#fff;' +
            'border:3px solid #ffee00;box-shadow:0 0 22px rgba(255,238,0,.35),0 10px 30px rgba(0,0,0,.6);font:700 14px/1.35 Nunito,system-ui,sans-serif;' +
            'animation:dpUp .35s ease-out}' +
            '@keyframes dpUp{from{transform:translate(-50%,120%)}}' +
            '.dp-bar img{width:46px;height:46px;border-radius:11px;flex:none}' +
            '.dp-bar .t{flex:1;min-width:0}.dp-bar .t b{display:block;font-size:15px}.dp-bar .t small{color:#a9a6c4;font-size:12px}' +
            '.dp-bar .t a{color:#7ee8ff}' +
            '.dp-go{font-family:"Press Start 2P",monospace;font-size:11px;padding:13px 14px;border-radius:12px;border:0;cursor:pointer;background:#ffee00;' +
            'color:#111;box-shadow:0 4px 0 #8a7f00;text-decoration:none;flex:none}' +
            '.dp-go:active{transform:translateY(3px);box-shadow:0 1px 0 #8a7f00}' +
            '.dp-x{background:none;border:0;color:#a9a6c4;font-size:20px;cursor:pointer;padding:4px 6px;flex:none}';
        head.appendChild(css);
        bar = document.createElement('div');
        bar.className = 'dp-bar';
        var sub, action;
        if (prompt) {
            sub = mobile ? 'Full screen, works offline, free' : 'Install on this computer. <a href="' + app.setup + '">📱 On your phone? Scan the QR</a>';
            action = '<button class="dp-go" id="dpGo">INSTALL</button>';
        } else if (ios) {
            sub = 'Add it to your home screen in 3 taps';
            action = '<a class="dp-go" href="' + app.setup + '">HOW?</a>';
        } else {
            sub = mobile ? 'Put it on your home screen' : 'Play on your phone too';
            action = '<a class="dp-go" href="' + app.setup + '">' + (mobile ? 'HOW?' : '📱 QR') + '</a>';
        }
        bar.innerHTML = '<img src="' + app.icon.replace('apple-touch-icon', 'icon-192') + '" alt="">' +
            '<div class="t"><b>📲 Get the ' + app.name + ' app</b><small>' + sub + '</small></div>' + action +
            '<button class="dp-x" aria-label="Close">✕</button>';
        document.body.appendChild(bar);
        bar.querySelector('.dp-x').onclick = function () {
            try { localStorage.setItem(KEY, Date.now() + 3 * 864e5); } catch (e) { }
            bar.remove();
            ga('app_banner_close');
        };
        var go = bar.querySelector('#dpGo');
        if (go) go.onclick = function () {
            if (!prompt) return;
            prompt.prompt();
            prompt.userChoice.then(function (r) {
                if (r && r.outcome === 'accepted') bar.remove();
                ga('app_install_prompt', { outcome: r && r.outcome, app: app.title });
            });
            prompt = null;
        };
        ga('app_banner_show', { app: app.title, kind: prompt ? 'prompt' : ios ? 'ios' : 'link' });
    }
    function rebuild() { if (bar) { bar.remove(); bar = null; } build(); }
    function whenReady(fn) { if (document.body) fn(); else window.addEventListener('DOMContentLoaded', fn); }

    window.addEventListener('beforeinstallprompt', function (e) {
        e.preventDefault();
        prompt = e;
        whenReady(rebuild);
    });
    window.addEventListener('appinstalled', function () {
        if (bar) bar.remove();
        ga('app_installed', { app: app.title });
    });
    // No install prompt (iPhone, Firefox, Safari on Mac, or already installed):
    // after a moment show the banner with a link to the step-by-step page instead.
    window.addEventListener('load', function () {
        setTimeout(function () { if (!bar) build(); }, ios ? 800 : 2500);
    });
})();
