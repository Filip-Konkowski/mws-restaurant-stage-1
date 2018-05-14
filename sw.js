const staticCacheName = 'mws-v1';
const imageCacheName = 'mws-image';

var allCaches = [
    staticCacheName,
    imageCacheName
];

self.addEventListener('install', function(event) {

    event.waitUntil(
        caches.open(staticCacheName).then(function(cache) {
            return cache.addAll([
                    '/',
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

    if(requestUrl.pathname.startsWith("/img")) {
        event.respondWith(servePhoto(event.request));
        return;
    }

    if (event.request.clone().method == "POST") {
        console.log('method POST')
        console.log('header POST', self)
        fetch(event.request.clone()).catch(function() {
            console.log('catch POST')
            // const allClients = self.clients.matchAll({
            //     includeUncontrolled: true
            // })
            // console.log('allClients POST', allClients)

            // If it doesn't work, post a failure message to the client
            // self.clients.match(thisClient).then(function(client) {
            //     client.postMessage({
            //         message: "Post unsuccessful.",
            //         alert: alert // A string we instantiated earlier
            //     });
            // });
            // Respond with the page that the request originated from
            // return caches.match(event.request.clone().referrer);
        });
    }

    event.respondWith(
        caches.match(event.request).then(function(response) {
            return response || fetch(event.request).catch(function(error) {console.error('cached: ',error)});
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
