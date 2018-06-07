importScripts('/node_modules/idb/lib/idb.js');

const staticCacheName = 'mws-v1';
const imageCacheName = 'mws-image';
const externalServerReviews = 'http://localhost:1337/reviews';
let DBName = 'mws';
let ReviewsDataStore = 'mws-review';
let RestaurantDataStore = 'mws-store';
let OutboxDataStore = 'mws-outbox';
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
                'node_modules/idb/lib/idb.js',
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

self.addEventListener('sync', function (event) {
    console.log('going to sync idb with net');
    if (event.tag === 'sync') {
        event.waitUntil(
            sendReviews().then((response) => {
                console.log('synced response', response);
            }).catch(err => {
                console.log('error syncing', err);
            })
        );
    }

    if (event.tag === 'sync-favorite') {
        event.waitUntil(
            sendFavorite().then((restaurant) => {
                console.log('synced response', restaurant);
            }).catch(err => {
                console.log('error syncing', err);
            })
        );
    }
});

function sendFavorite() {
    console.log('sendFavorite');
    return idb.open(OutboxDataStore, 1).then(db => {
        let tx = db.transaction('outbox-favorite', 'readonly');
        return tx.objectStore('outbox-favorite').openCursor().then(function cursorIterate(cursor) {
            if (!cursor) return;
            let favorite = cursor.value;
            console.log('iterating over cursor', cursor.value)
            console.log("http://localhost:1337/restaurants/" + favorite.restaurantId + "/?is_favorite=" + favorite.opinion)
//todo looks like I am not sending that request
            return fetch("http://localhost:1337/restaurants/" + favorite.restaurantId + "/?is_favorite=" + favorite.opinion, {
                method: 'PUT',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            }).then(response => {
                console.log('favorite response', response)
                return response.json();
            }).then(data => {
                if (data) {
                    console.log('data from fetch request o favorite', data)

                    idb.open('mws', 1).then(db => {
                        let tx = db.transaction(RestaurantDataStore, 'readwrite');
                        tx.objectStore(RestaurantDataStore).put(data)
                    });

                    idb.open(OutboxDataStore, 1).then(db => {
                        let tx = db.transaction('outbox-favorite', 'readwrite');
                        tx.objectStore('outbox-favorite').delete(cursor.key).then(sendFavorite);

                    });
                    return data

                }
            }).catch(e => { console.log('Fetch with sync favorite fail: ', e) });
        });
    })
}

function sendReviews() {
    return idb.open(OutboxDataStore, 1).then(db => {
        let tx = db.transaction('outbox', 'readonly');
        tx.objectStore('outbox').openCursor().then(function cursorIterate(cursor) {
            if (!cursor) return;
            let review = cursor.value;

            fetch(externalServerReviews, {
                method: 'POST',
                body: JSON.stringify(review),
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            }).then(response => {
                return response.json();
            }).then(data => {
                if (data) {
                    idb.open(OutboxDataStore, 1).then(db => {
                        let tx = db.transaction('outbox', 'readwrite');
                        tx.objectStore('outbox').delete(cursor.key).then(sendReviews);

                    });
                }
            }).catch(e => { console.log('Fetch with sync reviews fail: ', e) });
        });
    })
}

self.addEventListener('fetch', function(event) {
    let requestUrl = new URL(event.request.url);
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
                return response;
            }
        }
    )
}

function servePhoto(request) {
    let storageUrlRep = request.url.replace(/-\w+\.jpg$/, '');

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
    let storageId = Number(event.request.url.replace(/..+\/reviews\/.restaurant_id=/, ''));

    if (event.request.method === "GET") {

        //todo if can be refactor to use first fetch and than(IDB)
        return dbPromise.then(function (db) {
            if(db.objectStoreNames.contains(ReviewsDataStore)) {
                event.waitUntil(sendReviews());
                return fetchRequestAndAddToIndexDB(event, storageId)
            }

        }).then(function(reviews) {
            if(reviews instanceof Response) {
                return reviews
            }

            if (typeof reviews === 'undefined' || !reviews) {
                return dbPromise.then(function (db) {
                    let tx = db.transaction(ReviewsDataStore, 'readonly');
                    let store = tx.objectStore(ReviewsDataStore);
                    return store.get(storageId).then(reviews => {

                        let response = new Response(JSON.stringify(reviews.reviews), {
                            headers: new Headers({
                                'Content-type': 'application/json',
                                'Access-Control-Allow-Credentials': 'true'
                            }),
                            type: 'cors',
                            status: 200
                        });
                        return response;
                    });
                });
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
    }).catch(error => console.log('Fail to fetch from network: ', error));
}

function addRestaurantToIndexedDB(jsonData) {
    dbPromise.then(function(db) {
        let transaction = db.transaction(RestaurantDataStore, 'readwrite');
        let store = transaction.objectStore(RestaurantDataStore);

        jsonData.forEach(function(resData) {
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
        store.put({'reviews': jsonData, 'id': storageId});
    }).then(function() {
        console.log('All data added to DB successfully');
    }).catch(function(err) {
        console.log('error in DB adding', err);
        return false;
    });
}

function initDB() {
    console.log('initDB')

    idb.open('mws-outbox', 1, function(dbUpdate) {
        if (!dbUpdate.objectStoreNames.contains('outbox')) {
            console.log('createObjectStore outbox');
            dbUpdate.createObjectStore('outbox', { autoIncrement: true })
        }
        if (!dbUpdate.objectStoreNames.contains('outbox-favorite')) {
            console.log('createObjectStore outbox-favorite');
            dbUpdate.createObjectStore('outbox-favorite', { autoIncrement: true, keyPath: 'id'})
        }

    });

    dbPromise = idb.open(DBName, 1, function (upgradeDb) {
        if (!upgradeDb.objectStoreNames.contains('mws-review')) {
            console.log('createObjectStore ReviewsDataStore');
            upgradeDb.createObjectStore(ReviewsDataStore, { keyPath: 'id' })

        }
        if (!upgradeDb.objectStoreNames.contains('mws-store')) {
            console.log('createObjectStore mws-store');
            upgradeDb.createObjectStore('mws-store', { keyPath: 'id' })
        }
    }).catch(e => console.error(e));

}