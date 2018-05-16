const staticCacheName = 'mws-v1';
const imageCacheName = 'mws-image';
const reviewCacheName = 'mws-review';

var allCaches = [
    staticCacheName,
    imageCacheName
];

self.addEventListener('install', function(event) {

    event.waitUntil(
        caches.open(staticCacheName).then(function(cache) {
            return cache.addAll([
                '/',
                '/restaurant.html',
                'js/dbhelper.js',
                'js/main.js',
                'js/restaurant_info.js',
                'js/indexeddb.js',
                'css/styles.css',
                'css/styles-medium.css',
                'css/styles-large.css',
            ]);
        })
    );
});


self.addEventListener('activate', function(event) {
    console.log('addEventListener active')
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.filter(function(cacheName) {
                    return cacheName.startsWith('mws-') &&
                        !allCaches.includes(cacheName)
                }).map(function(cacheName) {
                    return caches.delete(cacheName);
                })
            );
        })
    );
});

self.addEventListener('fetch', function(event) {
    var requestUrl = new URL(event.request.url);

    let request = event.request;
    if (/restaurant\.html/.test(event.request.url)) {
        request = new Request('/restaurant.html');
    }

    if(requestUrl.pathname.startsWith("/img")) {
        event.respondWith(servePhoto(event.request));
        return;
    }

    if(/reviews/.test(event.request.url)) {
        event.respondWith(this.serveReviews(event.request));
        return;
    }

    event.respondWith(
        caches.match(request).then(function(response) {
            return response || fetch(request).catch(function(error) {console.error('cached: ',error)});
        })
    );
});

function servePhoto(request) {

    var storageUrlRep = request.url.replace(/-\w+\.jpg$/, '');

    return caches.open(imageCacheName).then(function(cache) {
        return cache.match(storageUrlRep).then(function (response) {
            // console.log('response',response);
             if(response) return response;

            return fetch(request).then(function(networkResponse) {
                // console.log('networkResponse', networkResponse)
                cache.put(storageUrlRep, networkResponse.clone());
                return networkResponse
            })
        })
    })
}

function serveReviews(request) {
    console.log('review', request.url)
    var storageId = request.url.replace(/..+\/reviews\/.restaurant_id=/, '');

    return caches.open(reviewCacheName).then(function(cache) {
        return cache.match(storageId).then(function(response) {
            if(response) return response;

            return fetch(request).then(function (networkResponse) {
                console.log('network response for reviews', networkResponse)
                cache.put(storageId, networkResponse.clone());
                return networkResponse;
            })
        })
    })
}