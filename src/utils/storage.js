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
    // create transaction
    const transaction = db.transaction("journals", "readwrite");
    const objectStore = transaction.objectStore("journals");
    
    // make request
    const addRequest = await addObject(id, objectStore);
    
    // commit and return
    transaction.commit();
    return addRequest
}

async function updateJournal(id, content) {
    // create transaction
    const transaction = db.transaction("journals", "readwrite");
    const objectStore = transaction.objectStore("journals");

    // make request
    const putRequest = await putObject(
        {
            id: id,
            content: content
        },
        objectStore
    );

    // commit and return
    transaction.commit();
    return putRequest
}

async function putObject(newData, objectStore) {
    return new Promise((resolve, reject) => {
        // add an empty journal entry
        const addRequest = objectStore.put(newData);

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

async function addObject(id, objectStore) {
    return new Promise((resolve, reject) => {
        // add an empty journal entry
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