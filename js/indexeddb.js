const DBNAME = 'mws';

class IndexedDBHelper {


    constructor() {
        this.idb = window.indexedDB;
        if (!this.idb) {
            console.log("Your browser doesn't support a stable version of IndexedDB. Such and such feature will not be available.");

        }

    }

    static openIdb(name, version = 1) {
        this.nameDB = name;
        this.versionDB = version;

        request = this.idb.open(name, version);

        request.onerror = function(event) {
            console.log("Database error: " + event.target.errorCode);
        };

        request.onupgradeneeded = function(event) {
            let db = event.target.result;

            var objectStore = db.createObjectStore("mws-store", {keyPath: 'id'});

            this.objectStore = objectStore;

        }
    }

    static putData(data) {

        this.objectStore.transaction.oncomplete = function (event) {
            db.transaction('mws-store', 'readwrite').objectStore('mws-store');

        }


        var tx = db.transaction('wittrs', 'readwrite');
        var store = tx.objectStore('wittrs');
        messages.forEach(function(message) {
            store.put(message);
        });

    }
    static fetchAllFromIndexedDB(callback) {
        let indexDbHelper = window.indexedDB;
        console.log('IndexedDBHelper.dbName', DBNAME);
        let request = indexDbHelper.open(DBNAME, 4);
        request.onsuccess = function(event) {
            let db = event.target.result;
            let transaction = db.transaction("mws-store");
            let objectStore = transaction.objectStore("mws-store");
            objectStore.getAll().onsuccess = function (event) {
                restaurants = event.target.result;
                console.log('request result', restaurants)
                if (restaurants) {
                    callback(null, restaurants);
                } else {
                    callback('Restaurant does not exist', null);
                }

            }

        };

        request.onerror = function() {
            console.log('Unable to fetch from indexed DB')
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
        let indexDbHelper = window.indexedDB;
        let request = indexDbHelper.open(DBNAME, 1);
        if(!this.isNumber(resteurantId)) {
            console.log('IndexedDB fetch error. ResteurantId is not Number type');
            return;
        }

        request.onsuccess = function(event) {
            let db = event.target.result;
            let transaction = db.transaction("mws-store");
            let objectStore = transaction.objectStore("mws-store");
            objectStore.get(resteurantId).onsuccess = function(event) {
                restaurant = event.target.result;
                this.indexedDbResults = restaurant;
                console.log('request result', this.indexedDbResults)
                if(restaurant) {
                    callback(null, restaurant);
                } else {
                    callback('Restaurant does not exist', null);
                }

            };
        }

        request.onerror = function() {
            console.log('Unable to fetch from indexed DB')
        }
    }

    static isNumber(n) {
        return !isNaN(parseFloat(n)) && !isNaN(n - 0)
    }
}

