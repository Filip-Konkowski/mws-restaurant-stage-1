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
}

