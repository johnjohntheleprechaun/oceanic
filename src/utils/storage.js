let db;

async function storageInit() {
    db = await dbInit();
    return db;
}

async function dbInit() {
    return new Promise((resolve, reject) => {
        const dbRequest = window.indexedDB.open("journals", 1);
        dbRequest.onsuccess = e => {
            resolve(e.target.result);
        };
        dbRequest.onerror = e => {
            reject(e.target.error);
        };
        dbRequest.onblocked = e => {
            reject(new Error("Database is blocked"));
        };
        dbRequest.onupgradeneeded = upgradeDB;
    });
}

async function upgradeDB() {
    // implement upgrade code for major changes here
    // this shouldn't be needed for quite a while
    console.log("upgrade");
}