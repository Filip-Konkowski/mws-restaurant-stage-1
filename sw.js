importScripts('/js/idb.js');

const staticCacheName = 'mws-v1';
const imageCacheName = 'mws-image';
let DBName = 'mws';
let ReviewsDataStore = 'mws-review';
let DBVersion = 2;
let dbPromise;

var allCaches = [
    staticCacheName,
    imageCacheName,
];


self.addEventListener('install', function(event) {

console.log('install sw');


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
    event.waitUntil(initDB());
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
        event.respondWith(serveReviews(event));
        return;
    }

    event.respondWith(
        caches.match(request).then(function(response) {
            return response || fetch(request).catch(function(error) {console.error('cached error : ',error)});
        })
    );
});

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
                console.log('Unable to fetch from indexed DB', event)
                return fetchRequestAndAddToIndexDB(event)
            }
            let tx = db.transaction(ReviewsDataStore, 'readonly');
            let store = tx.objectStore(ReviewsDataStore);
            return store.getAll();
        }).then(function(reviews) {

            if (!reviews.length) {
                // fetch it from net
                return fetch(event.request).then(function (response) {
                    return response.clone().json().then(json => {
                        // add to db
                        console.log('event respond fetch from net');
                        addReviewsToIndexedDB(json, storageId);
                        return response;
                    })
                });
            } else {
                let response = new Response(JSON.stringify(reviews[0].reviews), {
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

    if (event.request.method === "POST") {
        console.log('POST request', event.request);
        // let tx;
        // dbPromise.then(db => {
        //     let tx = db.transaction(ReviewsDataStore,'readwrite');
        //     let store = tx.objectStore(ReviewsDataStore);
        //     return store.get(2)
        // }).then(reviews => {
        //     console.log('before add',reviews)
        //     let myreview = {
        //         "id": 2,
        //         "restaurant_id": 2,
        //         "name": "AA Filip 423432 4234 23",
        //         "rating": 5,
        //         "comments": "comment text 42342 343 4 324 23 423 423 42 34 234 32"
        //     };
        //     reviews.reviews.push(myreview);
        //
        //     console.log('after add',reviews);
        //     return reviews;
        // }).then(function(reviews) {
        //
        //     dbPromise.then(db => {
        //         let tx = db.transaction(ReviewsDataStore,'readwrite');
        //         let store = tx.objectStore(ReviewsDataStore);
        //         console.log('before put reviews to IDB', reviews);
        //         return store.put(reviews)
        //
        //     }).then(() => {
        //         console.log('All data added to DB successfully');
        //     }).catch(error => {
        //         console.error('Put data to Index fail: ', error);
        //     });
        // }).catch(error => {
        //     console.error('Put data to Index fail: ', error);
        // });



    }
        // console.log('POST request');
        //
        //     // Try to get the response from the network
        // fetch(event.request).catch(function() {
        //     // If it doesn't work, post a failure message to the client
        //     console.log('indexedDB.open');
        //     let request = indexedDB.open('mws');
        //
        //
        //     request.onsuccess = function(e) {
        //         console.log('stored request: ', request)
        //
        //         var database = e.target.result;
        //         let tx = database.transaction('mws-review','readwrite')
        //         let store = tx.objectStore('mws-review')
        //         var req = store.add({
        //             "restaurant_id": 2,
        //             "name": "Filip",
        //             "rating": 3,
        //             "comments": "comment text"
        //         })
        //         e.target.result.close();
        //
        //         req.onsuccess = function (evt) {
        //             console.log("Insertion in DB successful");
        //         };
        //         req.onerror = function() {
        //             console.error("addPublication error", this.error);
        //         };
        //     };
        // });
}

self.addEventListener('sync', function (event) {
    if (event.tag === 'sync') {
        console.log('sync', event)
        // event.waitUntil(
        //     sendReviews().then(() => {
        //         console.log('synced');
        //     }).catch(err => {
        //         console.log(err, 'error syncing');
        //     })
        // );
    }
});

function fetchRequestAndAddToIndexDB(event) {
    return fetch(event.request).then(function (response) {
        return response.clone().json().then(json => {
            // add to db
            console.log('event respond fetch from net');
            addReviewsToIndexedDB(json, storageId);
            return response;
        })
    });
}

function createStore(dbName, storeName) {
    var request = indexedDB.open(dbName);
    request.onsuccess = function (e){
        var database = e.target.result;
        var version =  parseInt(database.version);
        database.close();
        console.log('version of db', version)
        var secondRequest = indexedDB.open(dbName, version + 1);
        secondRequest.onupgradeneeded = function (e) {
            var database = e.target.result;
            console.log('going to create DB store', storeName)
            var objectStore = database.createObjectStore(storeName, {
                keyPath: 'id'
            });
            DBVersion = version + 1;

        };
        // secondRequest.onsuccess = function (e) {
        //     DBVersion = version + 1;
        //     e.target.result.close();
        // }

        database.close();
    }
}

function addReviewsToIndexedDB(jsonData, storageId) {
    let transaction;
    dbPromise.then(function(db) {
        transaction = db.transaction(ReviewsDataStore, 'readwrite');
        let store = transaction.objectStore(ReviewsDataStore);

        console.log('jsonData', jsonData)
        store.put({'reviews': jsonData, 'id': storageId});
        jsonData.forEach(review => {
            console.log('jsonData[0].restaurant_id', jsonData[0].restaurant_id)
            store.put(review, {'restaurant_id': jsonData[0].restaurant_id});
        })
        return transaction.complete;
    }).then(function() {
        console.log('All data added to DB successfully');
    }).catch(function(err) {
        tx.abort();
        console.log('error in DB adding', err);
        return false;
    });
}


function readAllIDB(storeId, objectStore = "mws-review") {
    let request = this.indexedDB.open('mws');

    request.onerror = function(event) {
        console.error("Database error: " + event.target.error);
    };

    request.onsuccess = function(event)  {
        let db = event.target.result;
        var tx = db.transaction([objectStore], 'readonly');
        var store = tx.objectStore(objectStore);
        var requestGetReviews = store.get(storeId)
        requestGetReviews.onsuccess = function(event) {
            console.log('event.target.result.reviews', event.target.result.reviews)
            return event.target.result.reviews;
        };
    };

    return request;
}



function updateDB() {
    idb.open(DBName, 2, function (upgradeDb) {
        console.log('update DB Store');
        if (!upgradeDb.objectStoreNames.contains(ReviewsDataStore)) {
            console.log('updateDB ReviewsDataStore', ReviewsDataStore);
            upgradeDb.createObjectStore(ReviewsDataStore, { keyPath: 'id' });
        }

        if (!upgradeDb.objectStoreNames.contains('mws-store')) {
            console.log('updateDB ReviewsDataStore', 'mws-store');
            upgradeDb.createObjectStore('mws-store', { keyPath: 'id' });
        }
    });
}

function initDB() {
    console.log('initDB')
    dbPromise = idb.open(DBName, DBVersion, function (upgradeDb) {
        console.log('making DB Store');
        if (!upgradeDb.objectStoreNames.contains('mws-review')) {
            console.log('createObjectStore ReviewsDataStore');
            upgradeDb.createObjectStore(ReviewsDataStore, { keyPath: 'id' })

        }
        if (!upgradeDb.objectStoreNames.contains('mws-store')) {
            console.log('createObjectStore mws-store');
            upgradeDb.createObjectStore('mws-store', { keyPath: 'id' })
        }
    });
}