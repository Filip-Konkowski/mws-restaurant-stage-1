const DBNAME = 'mws';

class IndexedDBHelper {
    constructor() {
        if (!window.indexedDB) {
            console.log("Your browser doesn't support a stable version of IndexedDB. Such and such feature will not be available.");
        }
    }

    static openIdb(name = DBNAME, version = 1) {

        let request = window.indexedDB.open(name, version);

        request.onerror = function(event) {
            console.error("Database error: " + event.target.errorCode);
        };

        request.onupgradeneeded = function(event) {
            let db = event.target.result;
            var objectStore = db.createObjectStore("mws-store", {keyPath: 'id'});
        }

        return request
    }

    static putData(data) {
        let request = IndexedDBHelper.openIdb();

        request.onsuccess = function(event) {
            let db = event.target.result;
            // Store values in the newly created objectStore.
            let resteurantsObjectStore = db.transaction("mws-store", "readwrite").objectStore("mws-store");
            data.forEach(function (restaurant) {
                resteurantsObjectStore.add(restaurant);
            });
        }
    }

    static fetchAllFromIndexedDB(callback) {
        let request = IndexedDBHelper.openIdb();
        request.onsuccess = function(event) {
            let db = event.target.result;
            let transaction = db.transaction("mws-store");
            let objectStore = transaction.objectStore("mws-store");
            objectStore.getAll().onsuccess = function (event) {
                let restaurants = event.target.result;
                if (restaurants.length !== 0) {
                    callback(null, restaurants);
                } else {
                    callback('Restaurant does not exist', null);
                }

            }

        };

        request.onerror = function() {
            console.error('Unable to fetch from indexed DB')
        };
    }


    /**
     * Fetch all neighborhoods with proper error handling.
     */
    static fetchNeighborhoods(callback) {
        // Fetch all restaurants
        IndexedDBHelper.fetchAllFromIndexedDB((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                // Get all neighborhoods from all restaurants
                const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
                // Remove duplicates from neighborhoods
                const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
                callback(null, uniqueNeighborhoods);
            }
        });
    }

    /**
     * Fetch all cuisines with proper error handling.
     */
    static fetchCuisines(callback) {
        // Fetch all restaurants
        IndexedDBHelper.fetchAllFromIndexedDB((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                // Get all cuisines from all restaurants
                const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
                // Remove duplicates from cuisines
                const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
                callback(null, uniqueCuisines);
            }
        });
    }

    static fetchByIdFromIndexedDB(resteurantId, callback) {

        let request = IndexedDBHelper.openIdb();
        if(!this.isNumber(resteurantId)) {
            console.error('IndexedDB fetch error. ResteurantId is not Number type');
            return;
        }

        request.onsuccess = function(event) {

            let db = event.target.result;
            let transaction = db.transaction("mws-store");
            let objectStore = transaction.objectStore("mws-store");
            objectStore.get(resteurantId).onsuccess = function(event) {
                restaurant = event.target.result;
                this.indexedDbResults = restaurant;
                if(restaurant) {
                    return callback(null, restaurant);
                } else {
                    return callback('Restaurant does not exist', null);
                }

            };
        }

        request.onerror = function(event) {
            console.error('Unable to fetch from indexed DB', event)
        }
    }

    /**
     * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
     */
    static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
        // Fetch all restaurants
        IndexedDBHelper.fetchAllFromIndexedDB((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                let results = restaurants
                if (cuisine != 'all') { // filter by cuisine
                    results = results.filter(r => r.cuisine_type == cuisine);
                }
                if (neighborhood != 'all') { // filter by neighborhood
                    results = results.filter(r => r.neighborhood == neighborhood);
                }
                callback(null, results);
            }
        });
    }

    static isNumber(n) {
        return !isNaN(parseFloat(n)) && !isNaN(n - 0)
    }
}
