const DB_VERSION = 1;
/** @type {IDBDatabase} */
let db;

export async function dbInit() {
    return new Promise((resolve, reject) => {
        const dbRequest = window.indexedDB.open("journal", DB_VERSION);
        dbRequest.onsuccess = function() {
            db = dbRequest.result;
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

export async function createJournal(title) {
    // create transaction
    const transaction = db.transaction("entries", "readwrite");
    const objectStore = transaction.objectStore("entries");
    
    // make request
    const journal = {
        id: crypto.randomUUID(),
        created: Date.now(),
        title: title,
        content: ""
    }
    const addRequest = await addObject(journal, objectStore);
    
    // commit and return
    transaction.commit();
    return addRequest
}

export async function appendToJournal(id, text) {
    // create transaction
    const transaction = db.transaction("entries", "readwrite");
    const objectStore = transaction.objectStore("entries");

    // fetch current content
    const currentJournal = await getObject(id, objectStore);
    currentJournal.content += text;
    const putRequest = await putObject(currentJournal, objectStore);

    // commit and return
    transaction.commit();
    return putRequest;
}

export async function updateJournal(id, content) {
    // create transaction
    const transaction = db.transaction("entries", "readwrite");
    const objectStore = transaction.objectStore("entries");

    // make request
    const currentObject = await getObject(id, objectStore);
    const putRequest = await putObject(
        {
            id: currentObject.id,
            created: currentObject.created,
            title: currentObject.title,
            content: content
        },
        objectStore
    );

    // commit and return
    transaction.commit();
    return putRequest;
}

export async function getJournal(id) {
    // create transaction
    const transaction = db.transaction("entries", "readonly");
    const objectStore = transaction.objectStore("entries");

    // make request
    return await getObject(id, objectStore);
}

export async function listJournals() {
    // create transaction
    const transaction = db.transaction("entries", "readonly");
    const objectStore = transaction.objectStore("entries");

    const cursor = await openCursor(objectStore);

    return {
        [Symbol.asyncIterator]() {
            return {
                async next() {
                    if (cursor.value) {
                        const returnVal = { value: cursor.value, done: false };
                        await continueCursor(cursor);
                        return returnVal;
                    } else {
                        return { done: true };
                    }
                }
            };
        }
    };
}

async function continueCursor(cursor) {
    return new Promise((resolve, reject) => {
        cursor.request.onsuccess = function() {
            resolve(cursor);
        };
        cursor.request.onerror = function() {
            reject(cursor.request.error);
        };
        cursor.continue();
    });
}

async function openCursor(objectStore) {
    return new Promise((resolve, reject) => {
        const request = objectStore.openCursor();

        // bind functions
        request.onsuccess = function() {
            resolve(request.result);
        };
        request.onerror = function() {
            reject(request.error);
        };
    });
}

async function getObject(id, objectStore) {
    return new Promise((resolve, reject) => {
        // add an empty journal entry
        const addRequest = objectStore.get(id);

        // add event listeners
        addRequest.onsuccess = function() {
            // resolve with the journals ID (as per documentation the result should be the key)
            resolve(addRequest.result);
        };
        addRequest.onerror = function() {
            reject(addRequest.error);
        };
    });
}

async function putObject(newData, objectStore) {
    return new Promise((resolve, reject) => {
        // add an empty journal entry
        const addRequest = objectStore.put(newData);

        // add event listeners
        addRequest.onsuccess = function() {
            // resolve with the journals ID (as per documentation the result should be the key)
            resolve(addRequest.result);
        };
        addRequest.onerror = function() {
            reject(addRequest.error);
        };
    });
}

async function addObject(object, objectStore) {
    return new Promise((resolve, reject) => {
        // add an empty journal entry
        const addRequest = objectStore.add(object);

        // add event listeners
        addRequest.onsuccess = function() {
            // resolve with the journals ID (as per documentation the result should be the key)
            resolve(addRequest.result);
        };
        addRequest.onerror = function() {
            reject(addRequest.error);
        };
    });
}

async function upgradeDB(event) {
    /** @type IDBDatabase */
    const db = event.target.result;
    const objectStore = db.createObjectStore("entries", { keyPath: "id" });
    objectStore.createIndex("created", "created", { unique: false });
    objectStore.createIndex("title", "title", { unique: false });
}