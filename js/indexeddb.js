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

    static fetchByIdFromIndexedDB(resteurantId, callback) {
        let indexDbHelper = window.indexedDB;
        let request = indexDbHelper.open('mws', 4);
        console.log('typeof resteurantId',typeof resteurantId)
        if(!this.isNumber(resteurantId)) {
            console.log('IndexedDB fetch error. ResteurantId is not Number type');
            return;
        }

        request.onsuccess = function(event) {
            var db = event.target.result;
            var transaction = db.transaction("mws-store");
            var objectStore = transaction.objectStore("mws-store");
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

