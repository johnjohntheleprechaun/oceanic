const DB_VERSION = 1;
/** @type {IDBDatabase} */
let db;

async function storageInit() {
    db = await dbInit();
    
    return db;
}

async function dbInit() {
    return new Promise((resolve, reject) => {
        const dbRequest = window.indexedDB.open("journals", DB_VERSION);
        dbRequest.onsuccess = function() {
            resolve(dbRequest.result);
        };
        dbRequest.onerror = function() {
            reject(dbRequest.error);
        };
        dbRequest.onblocked = function() {
            reject(new Error("Database is blocked"));
        };
        dbRequest.onupgradeneeded = upgradeDB;
    });
}

async function upgradeDB(event) {
    const db = event.target.result;
    await db.createObjectStore("journals", { keyPath: "id" });
}

async function createJournal(id) {
    return new Promise((resolve, reject) => {
        // add an empty journal entry
        const transaction = db.transaction("journals", "readwrite");
        const objectStore = transaction.objectStore("journals");
        const addRequest = objectStore.add({
            id: id,
            createdAt: Date.now(),
            content: ""
        });

        // add event listeners
        addRequest.onsuccess = function() {
            // resolve with the journals ID (as per documentation the result should be the key)
            transaction.commit();
            resolve(addRequest.result);
        };
        addRequest.onerror = function() {
            reject(addRequest.error);
        };
    });
}