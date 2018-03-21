self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open('mws-v1').then(function(cache){
            return cache.addAll(
                [
                    '/',
                    '/js/dbhelper.js',
                    '/js/main.js',
                    '/js/restaurant_info.js',
                    '/css/styles.css',
                    '/css/styles-medium.css',
                    '/css/styles-large.css'
                ]
            )
        })
    )
});

self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request).then(function(response) {
            if(response) return response;
            return fetch(event.request);
    })
    )
});


