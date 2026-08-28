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
})();
