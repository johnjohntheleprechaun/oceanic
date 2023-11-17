const DB_VERSION = 2;
let db: IDBDatabase;

export interface Journal {
    id: string,
    created: number,
    title: string,
    type: string,
    content: string
}

export async function dbInit() {
    // requeset persistent storage
    if (navigator.storage && !await navigator.storage.persisted()){
        await navigator.storage.persist();
    } else if (!navigator.storage) {
        // notify users somehow
    }
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
        dbRequest.onupgradeneeded = function(event: IDBVersionChangeEvent) {
            upgradeDB(event, dbRequest.result, dbRequest.transaction);
        };
    });
}

export async function createJournal(title: string, type: string): Promise<string> {
    // create transaction
    const transaction = db.transaction("entries", "readwrite");
    const objectStore = transaction.objectStore("entries");
    
    // make request
    const journal = {
        id: crypto.randomUUID(),
        created: Date.now(),
        title: title,
        type: type,
        content: ""
    }
    const addRequest = await addObject(journal, objectStore);
    
    // commit and return
    transaction.commit();
    return addRequest
}

export async function updateJournal(journal: Journal) {
    // create transaction
    const transaction = db.transaction("entries", "readwrite");
    const objectStore = transaction.objectStore("entries");

    // make request
    const putRequest = await putObject(journal, objectStore);

    // commit and return
    transaction.commit();
    return putRequest;
}

export async function getJournal(id: string): Promise<Journal> {
    // create transaction
    const transaction = db.transaction("entries", "readonly");
    const objectStore = transaction.objectStore("entries");

    // make request
    return await getObject(id, objectStore);
}

export async function listJournals(transaction?: IDBTransaction) {
    // create transaction
    if (!transaction) {
        transaction = db.transaction("entries", "readonly");
    }
    const objectStore = transaction.objectStore("entries");
    const index = objectStore.index("created");

    const cursor = await openCursor(index);

    return {
        [Symbol.asyncIterator]() {
            return {
                async next() {
                    if (!cursor) {
                        return { done: true };
                    }
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

async function continueCursor(cursor: IDBCursor) {
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

async function openCursor(objectStore: IDBObjectStore | IDBIndex): Promise<IDBCursorWithValue> {
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

async function getObject(id: string, objectStore: IDBObjectStore | IDBIndex): Promise<Journal> {
    return new Promise((resolve, reject) => {
        // add an empty journal entry
        const addRequest = objectStore.get(id);

        // add event listeners
        addRequest.onsuccess = function() {
            resolve(addRequest.result);
        };
        addRequest.onerror = function() {
            reject(addRequest.error);
        };
    });
}

async function putObject(newData: any, objectStore: IDBObjectStore): Promise<string> {
    return new Promise((resolve, reject) => {
        // add an empty journal entry
        const addRequest = objectStore.put(newData);

        // add event listeners
        addRequest.onsuccess = function() {
            // resolve with the journals ID (as per documentation the result should be the key)
            resolve(addRequest.result.toString());
        };
        addRequest.onerror = function() {
            reject(addRequest.error);
        };
    });
}

async function addObject(object: any, objectStore: IDBObjectStore): Promise<string> {
    return new Promise((resolve, reject) => {
        // add an empty journal entry
        const addRequest = objectStore.add(object);

        // add event listeners
        addRequest.onsuccess = function() {
            // resolve with the journals ID (as per documentation the result should be the key)
            resolve(addRequest.result.toString());
        };
        addRequest.onerror = function() {
            reject(addRequest.error);
        };
    });
}

async function upgradeDB(event: IDBVersionChangeEvent, db: IDBDatabase, transaction: IDBTransaction) {
    console.log(event.oldVersion);
    if (event.oldVersion === 0) { // no database previously
        const objectStore = db.createObjectStore("entries", { keyPath: "id" });
        objectStore.createIndex("created", "created", { unique: false });
        objectStore.createIndex("title", "title", { unique: false });
    }
    else if (event.oldVersion === 1) {
        const objectStore = transaction.objectStore("entries");
        objectStore.createIndex("type", "type", { unique: false });
        const journals = await listJournals(transaction);
        for await (const journal of journals) {
            journal.type = "messages";
            await putObject(journal, objectStore);
        }
    }
}