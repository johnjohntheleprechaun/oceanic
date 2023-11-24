const DB_VERSION = 2;

interface JournalInterface {
    id: string,
    created: number,
    title: string,
    type: string,
    content: string
}

class Journal {
    id: string;
    journal: JournalInterface;
    db: JournalDatabase;
    loaded: boolean;

    constructor (id: string, db?: JournalDatabase, journal?: JournalInterface) {
        this.id = id;
        this.db = db ? db : undefined;
        this.journal = journal ? journal : undefined;
        this.loaded = !!journal;
    }
    async ensureLoaded() {
        if (!this.db) {
            console.log("no db");
            this.db = new JournalDatabase();
            console.log("created db");
        }
        if (!this.loaded) {
            console.log("not loaded");
            this.journal = await this.db.getJournal(this.id);
            console.log("loaded");
        }
    }

    public async getCreated() {
        await this.ensureLoaded();
        return this.journal.created;
    }
    public async getType() {
        await this.ensureLoaded();
        return this.journal.type;
    }
    public async getTitle() {
        await this.ensureLoaded();
        return this.journal.title;
    }
    public async getContent() {
        console.log("get content");
        await this.ensureLoaded();
        console.log("loaded");
        return this.journal.content;
    }


    public async setTitle(newTitle: string) {
        await this.ensureLoaded();
        this.journal.title = newTitle;
        await this.db.updateJournal(this.journal);
    }
    public async setContent(newContent: string) {
        await this.ensureLoaded();
        this.journal.content = newContent;
        await this.db.updateJournal(this.journal);
    }
    public async appendContent(data: string) {
        await this.ensureLoaded();
        this.journal.content += data;
        this.db.updateJournal(this.journal);
    }
}

class JournalDatabase {
    db: IDBDatabase

    async ensureLoaded() {
        if (!this.db) {
            await this.init();
        }
    }

    async init() {
        await navigator.storage.persist();
        const dbRequest = window.indexedDB.open("journal", DB_VERSION);

        return new Promise((resolve, reject) => {
            dbRequest.onsuccess = () => {
                this.db = dbRequest.result;
                resolve(dbRequest.result);
            };
            dbRequest.onerror = function() {
                reject(dbRequest.error);
            };
            dbRequest.onblocked = function() {
                reject(new Error("Database is blocked"));
            };
            dbRequest.onupgradeneeded = (event: IDBVersionChangeEvent) => {
                this.upgradeDB(event, dbRequest.result, dbRequest.transaction);
            };
        });
    }

    async getJournal(id: string) {
        console.log("getting journal", id);
        await this.ensureLoaded();
        console.log("loaded");
        // create transaction
        const transaction = this.db.transaction("entries", "readonly");
        console.log("transaction", transaction);
        const objectStore = transaction.objectStore("entries");
        console.log("store", objectStore);

        // make request
        return await getObject(id, objectStore) as JournalInterface;
    }

    async createJournal(title: string, type: string): Promise<string> {
        await this.ensureLoaded();
        // create transaction
        const transaction = this.db.transaction("entries", "readwrite");
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

    async updateJournal(journal: JournalInterface) {
        await this.ensureLoaded();
        // create transaction
        const transaction = this.db.transaction("entries", "readwrite");
        const objectStore = transaction.objectStore("entries");
    
        // make request
        const putRequest = await putObject(journal, objectStore);
    
        // commit and return
        transaction.commit();
        return putRequest;
    }

    async listJournals(transaction?: IDBTransaction) {
        await this.ensureLoaded();
        // create transaction
        if (!transaction) {
            transaction = this.db.transaction("entries", "readonly");
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
                            const returnVal = {
                                value: new Journal(cursor.value.id, this, cursor.value),
                                done: false
                            };
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

    async upgradeDB(event: IDBVersionChangeEvent, db: IDBDatabase, transaction: IDBTransaction) {
        console.log(event.oldVersion);
        if (event.oldVersion === 0) { // no database previously
            const objectStore = db.createObjectStore("entries", { keyPath: "id" });
            objectStore.createIndex("created", "created", { unique: false });
            objectStore.createIndex("title", "title", { unique: false });
        }
        else if (event.oldVersion === 1) {
            const objectStore = transaction.objectStore("entries");
            objectStore.createIndex("type", "type", { unique: false });
            const journals = await this.listJournals(transaction);
            for await (const journal of journals) {
                journal.type = "messages";
                await putObject(journal, objectStore);
            }
        }
    }
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

async function getObject(id: string, objectStore: IDBObjectStore | IDBIndex): Promise<Object> {
    console.log("getting object in store", objectStore);
    console.log(id);
    return new Promise((resolve, reject) => {
        // add an empty journal entry
        const addRequest = objectStore.get(id);
        console.log("request", addRequest);

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

export {
    Journal,
    JournalDatabase
}