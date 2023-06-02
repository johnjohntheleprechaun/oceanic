let db;

async function dbInit() {
    if (!window.indexedDB) {
        window.alert("Your browser doesn't support indexedDB. This means that journal files cannot be stored locally.");
    }
    const dbRequest = window.indexedDB.open("journals", 1);
    dbRequest.onsuccess = dbLoadSuccess;
    dbRequest.onerror = dbLoadError;
    dbRequest.onblocked = dbLoadBlocked;
    dbRequest.onupgradeneeded = upgradeDB;
    return dbRequest;
}

async function dbLoadSuccess(event) {
    db = event.target.result;
}

async function dbLoadError(event) {
    throw event.target.error;
}

async function dbLoadBlocked(event) {
    console.log(event);
    return;
}

async function upgradeDB() {
    // implement upgrade code for major changes here
    // this shouldn't be needed for quite a while
}