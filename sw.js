var staticCacheName = 'mws-v1';

self.addEventListener('install', function(event) {

    event.waitUntil(
        caches.open(staticCacheName).then(function(cache) {
            return cache.addAll([
                    '/',
                    'js/dbhelper.js',
                    'js/main.js',
                    'js/restaurant_info.js',
                    'css/styles.css',
                    'css/styles-medium.css',
                    'css/styles-large.css',
                ]);
        })
    );
});



self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.filter(function(cacheName) {
                    return cacheName.startsWith('mws-') &&
                        cacheName != staticCacheName;
                }).map(function(cacheName) {
                    return caches.delete(cacheName);
                })
            );
        })
    );
});

self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request).then(function(response) {
            if(response) return response;
            return fetch(event.request);
    })
    )
});


