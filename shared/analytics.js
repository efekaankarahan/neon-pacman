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
    if (!document.querySelector('link[rel="manifest"]')) tag('link', { rel: 'manifest', href: '/manifest.webmanifest' });
    if (!document.querySelector('meta[name="theme-color"]')) tag('meta', { name: 'theme-color', content: '#111111' });
    tag('link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' });
    tag('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' });
    tag('meta', { name: 'mobile-web-app-capable', content: 'yes' });
    tag('meta', { name: 'apple-mobile-web-app-title', content: 'Darky Play' });
    tag('meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' });

    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
        window.addEventListener('load', function () {
            navigator.serviceWorker.register('/sw.js').catch(function () { });
        });
    }

    // Install button: only on the home page and the Arcade, never over a game.
    var path = location.pathname.replace(/index\.html$/, '');
    if (path !== '/' && path !== '/arcade/') return;
    var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone;
    if (standalone) return;
    var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var prompt = null, btn = null;

    function makeButton() {
        if (btn) return;
        var css = document.createElement('style');
        css.textContent = '.dp-install{position:fixed;right:16px;bottom:16px;z-index:9999;font-family:"Press Start 2P",monospace;font-size:11px;' +
            'padding:14px 16px;border-radius:14px;border:0;cursor:pointer;background:#ffee00;color:#111;box-shadow:0 0 18px rgba(255,238,0,.55),0 5px 0 #8a7f00}' +
            '.dp-install:active{transform:translateY(3px)}' +
            '.dp-ios{position:fixed;left:50%;bottom:84px;transform:translateX(-50%);z-index:9999;width:min(340px,92vw);background:#1d1b2b;color:#fff;' +
            'border:3px solid #ffee00;border-radius:14px;padding:14px;font:700 15px/1.45 Nunito,system-ui,sans-serif;text-align:center;display:none}' +
            '.dp-ios.on{display:block}';
        head.appendChild(css);
        btn = document.createElement('button');
        btn.className = 'dp-install';
        btn.textContent = '📲 INSTALL APP';
        document.body.appendChild(btn);
        var tip = null;
        btn.onclick = function () {
            if (prompt) {
                prompt.prompt();
                prompt.userChoice.then(function (r) {
                    if (r && r.outcome === 'accepted') btn.remove();
                    try { gtag('event', 'app_install_prompt', { outcome: r && r.outcome }); } catch (e) { }
                });
                prompt = null;
                return;
            }
            if (!tip) {
                tip = document.createElement('div');
                tip.className = 'dp-ios';
                tip.innerHTML = 'To install Darky Play: tap the <b>Share</b> button (the square with an arrow ⬆️) at the bottom of Safari, ' +
                    'then <b>Add to Home Screen</b> ➕.';
                document.body.appendChild(tip);
            }
            tip.classList.toggle('on');
        };
    }
    window.addEventListener('beforeinstallprompt', function (e) {
        e.preventDefault();
        prompt = e;
        if (document.body) makeButton(); else window.addEventListener('DOMContentLoaded', makeButton);
    });
    window.addEventListener('appinstalled', function () {
        if (btn) btn.remove();
        try { gtag('event', 'app_installed'); } catch (e) { }
    });
    if (ios) {
        if (document.body) makeButton(); else window.addEventListener('DOMContentLoaded', makeButton);
    }
})();
