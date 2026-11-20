/*
 * Darky Play service worker
 * -------------------------
 * Makes the site an installable app and lets pages you have opened before
 * load without a connection.
 *
 * Pages: network first, so a new version is seen as soon as it is deployed;
 * the cached copy is only used when offline.
 * Files (js, css, images, sounds): served from the cache straight away and
 * refreshed in the background. Pages load them with ?v=N, so a changed file
 * gets a new address and is never stuck on an old copy.
 * Other sites (Google Fonts, analytics) are left alone.
 */
var CACHE = 'darkyplay-v1';
var CORE = ['/', '/arcade/', '/arcade/darkys/', '/style.css', '/favicon.svg', '/icon-192.png', '/icon-512.png', '/manifest.webmanifest'];

self.addEventListener('install', function (e) {
    e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).catch(function () { }));
    self.skipWaiting();
});

self.addEventListener('activate', function (e) {
    e.waitUntil(caches.keys().then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
    var req = e.request;
    if (req.method !== 'GET') return;
    var url = new URL(req.url);
    if (url.origin !== location.origin) return;

    if (req.mode === 'navigate') {
        e.respondWith(fetch(req).then(function (res) {
            var copy = res.clone();
            caches.open(CACHE).then(function (c) { c.put(req, copy); });
            return res;
        }).catch(function () {
            return caches.match(req, { ignoreSearch: true }).then(function (hit) { return hit || caches.match('/'); });
        }));
        return;
    }

    e.respondWith(caches.match(req).then(function (hit) {
        var net = fetch(req).then(function (res) {
            if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
            return res;
        }).catch(function () { return hit; });
        return hit || net;
    }));
});
