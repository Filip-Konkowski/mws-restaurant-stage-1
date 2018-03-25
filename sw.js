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
                    'img/1-800_large_1x.jpg',
                    'img/1-1600_large_x2.jpg',
                    'img/1-medium.jpg',
                    'img/1-small.jpg',
                    'img/2-800_large_1x.jpg',
                    'img/2-1600_large_x2.jpg',
                    'img/2-medium.jpg',
                    'img/2-small.jpg',
                    'img/3-800_large_1x.jpg',
                    'img/3-1600_large_x2.jpg',
                    'img/3-medium.jpg',
                    'img/3-small.jpg',
                    'img/4-800_large_1x.jpg',
                    'img/4-1600_large_x2.jpg',
                    'img/4-medium.jpg',
                    'img/4-small.jpg',
                    'img/5-800_large_1x.jpg',
                    'img/5-1600_large_x2.jpg',
                    'img/5-medium.jpg',
                    'img/5-small.jpg',
                    'img/6-800_large_1x.jpg',
                    'img/6-1600_large_x2.jpg',
                    'img/6-medium.jpg',
                    'img/6-small.jpg',
                    'img/7-800_large_1x.jpg',
                    'img/7-1600_large_x2.jpg',
                    'img/7-medium.jpg',
                    'img/7-small.jpg',
                    'img/8-800_large_1x.jpg',
                    'img/8-1600_large_x2.jpg',
                    'img/8-medium.jpg',
                    'img/8-small.jpg',
                    'img/9-800_large_1x.jpg',
                    'img/9-1600_large_x2.jpg',
                    'img/9-medium.jpg',
                    'img/9-small.jpg',
                    'img/10-800_large_1x.jpg',
                    'img/10-1600_large_x2.jpg',
                    'img/10-medium.jpg',
                    'img/10-small.jpg',
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


