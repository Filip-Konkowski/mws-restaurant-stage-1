importScripts('/node_modules/idb/lib/idb.js');

const staticCacheName = 'mws-v1';
const imageCacheName = 'mws-image';
let DBName = 'mws';
let ReviewsDataStore = 'mws-review';
let RestaurantDataStore = 'mws-store';
let DBVersion = 1;
let dbPromise;

let allCaches = [
    staticCacheName,
    imageCacheName,
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
                'css/styles.css',
                'css/styles-medium.css',
                'css/styles-large.css',
            ]);
        })
    );
});


self.addEventListener('activate',  event => {

    console.log('activate 2 sw');
    event.waitUntil((function(){
        self.clients.claim();
        initDB();
    })());
});


self.addEventListener('activate', function(event) {

    console.log('activate 1 sw');
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
    if (event.request.url.endsWith('localhost:1337/restaurants')){
        event.respondWith(serveRestaurant(event));
        return;
    }

    let request = event.request;
    if (/restaurant\.html/.test(event.request.url)) {
        request = new Request('/restaurant.html');
    }

    if(requestUrl.pathname.startsWith("/img")) {
        event.respondWith(servePhoto(event.request));
        return;
    }

    if(/reviews/.test(event.request.url)) {
        event.respondWith(serveReviews(event));
        return;
    }

    event.respondWith(
        caches.match(request).then(function(response) {
            return response || fetch(request).catch(function(error) {console.error('cached error : ',error)});
        })
    );
});

function serveRestaurant(event) {
    return dbPromise
        .then(db => {
            let tx = db.transaction(RestaurantDataStore, 'readonly');
            let store = tx.objectStore(RestaurantDataStore);
            return store.getAll();
        }).then( resteurants => {
            if (!resteurants.length) {
                return fetch(event.request).then(function (response) {
                    return response.clone().json().then(json => {
                        console.log('event respond fetch from net');
                        addRestaurantToIndexedDB(json);
                        return response;
                    })
                });
            } else {
                let response = new Response(JSON.stringify(resteurants), {
                    headers: new Headers({
                        'Content-type': 'application/json',
                        'Access-Control-Allow-Credentials': 'true'
                    }),
                    type: 'cors',
                    status: 200
                });
                console.log('already in DB');
                return response;
            }
        }
    )
}

function servePhoto(request) {
    var storageUrlRep = request.url.replace(/-\w+\.jpg$/, '');

    return caches.open(imageCacheName).then(function(cache) {
        return cache.match(storageUrlRep).then(function (response) {
             if(response) return response;

            return fetch(request).then(function(networkResponse) {
                cache.put(storageUrlRep, networkResponse.clone());
                return networkResponse
            })
        })
    })
}

function serveReviews(event) {
    var storageId = Number(event.request.url.replace(/..+\/reviews\/.restaurant_id=/, ''));

    if (event.request.method === "GET") {
        return dbPromise.then(function (db) {
            if(!db.objectStoreNames.contains(ReviewsDataStore)) {
                return fetchRequestAndAddToIndexDB(event, storageId)
            }
            let tx = db.transaction(ReviewsDataStore, 'readonly');
            let store = tx.objectStore(ReviewsDataStore);
            return store.get(storageId);
        }).then(function(reviews) {
            console.log('Fetched from IDB reviews', reviews)
            if (typeof reviews === 'undefined' || !reviews) {
                console.log('Fetch from network')
                return fetch(event.request).then(function (response) {
                    return response.clone().json().then(json => {
                        addReviewsToIndexedDB(json, storageId);
                        return response;
                    })
                });
            } else {
                let response = new Response(JSON.stringify(reviews.reviews), {
                    headers: new Headers({
                        'Content-type': 'application/json',
                        'Access-Control-Allow-Credentials': 'true'
                    }),
                    type: 'cors',
                    status: 200
                });
                console.log('already in DB');
                return response;
            }
        });

    }

}

function fetchRequestAndAddToIndexDB(event, storageId) {
    return fetch(event.request).then(function (response) {
        return response.clone().json().then(json => {
            addReviewsToIndexedDB(json, storageId);
            return response;
        })
    });
}

function addRestaurantToIndexedDB(jsonData) {
    dbPromise.then(function(db) {
        let transaction = db.transaction(RestaurantDataStore, 'readwrite');
        let store = transaction.objectStore(RestaurantDataStore);

        console.log('jsonData', jsonData)

        jsonData.forEach(function(resData) {
            console.log('adding resData', resData);
            store.put(resData);  // put is safer because it doesn't give error on duplicate add
        });
        return transaction.complete;
    }).then(function() {
        console.log('All data added to DB successfully');
    }).catch(function(err) {
        console.log('error in DB adding', err);
        return false;
    });
}

function addReviewsToIndexedDB(jsonData, storageId) {
    dbPromise.then(function(db) {
        let transaction = db.transaction(ReviewsDataStore, 'readwrite');
        let store = transaction.objectStore(ReviewsDataStore);

        console.log('jsonData', jsonData)
        store.put({'reviews': jsonData, 'id': storageId});
        return transaction.complete;
    }).then(function() {
        console.log('All data added to DB successfully');
    }).catch(function(err) {
        console.log('error in DB adding', err);
        return false;
    });
}

function initDB() {
    console.log('initDB')
    // let openRequest = indexedDB.open(DBName, 1);
    //
    // openRequest.onupgradeneeded = function(e) {
    //     var upgradeDb = e.target.result;
    //     dbPromise = upgradeDb
    //     console.log('running onupgradeneeded');
    //     if (!upgradeDb.objectStoreNames.contains('mws-review')) {
    //         console.log('createObjectStore ReviewsDataStore');
    //         upgradeDb.createObjectStore(ReviewsDataStore, { keyPath: 'id' })
    //
    //     }
    //     if (!upgradeDb.objectStoreNames.contains('mws-store')) {
    //         console.log('createObjectStore mws-store');
    //         upgradeDb.createObjectStore('mws-store', { keyPath: 'id' })
    //     }
    // };


    dbPromise = idb.open(DBName, 1, function (upgradeDb) {
        console.log('making DB Store');
        if (!upgradeDb.objectStoreNames.contains('mws-review')) {
            console.log('createObjectStore ReviewsDataStore');
            upgradeDb.createObjectStore(ReviewsDataStore, { keyPath: 'id' })

        }
        if (!upgradeDb.objectStoreNames.contains('mws-store')) {
            console.log('createObjectStore mws-store');
            upgradeDb.createObjectStore('mws-store', { keyPath: 'id' })
        }
        if (!upgradeDb.objectStoreNames.contains('outbox')) {
            console.log('createObjectStore outbox');
            upgradeDb.createObjectStore('outbox', { autoIncrement:true })
        }
    }).catch(e => console.error(e));

}