const DB_VERSION = 3;

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
        this.db = db;
        this.journal = journal;
        this.loaded = !!journal;
    }

    async ensureLoaded() {
        if (!this.db) {
            this.db = await JournalDatabase.open();
        }
        if (!this.loaded) {
            this.journal = await this.db.getJournal(this.id);
            this.loaded = true;
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
        await this.ensureLoaded();
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
    public async setType(newType: string) {
        await this.ensureLoaded();
        this.journal.type = newType
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

    public static async open(): Promise<JournalDatabase> {
        const database = new JournalDatabase();
        await database.init();
        return database;
    }
    async init() {
        await navigator.storage.persist();
        const dbRequest = window.indexedDB.open("journal", DB_VERSION);
        
        let upgradeFunc: () => Promise<any>;
        let initPromise = new Promise((resolve, reject) => {
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
                upgradeFunc = this.upgradeDB(event, dbRequest.result, dbRequest.transaction, resolve);
            };
        });
        await initPromise;
        //console.log("initialize promise finished");
        if (upgradeFunc) {
            await upgradeFunc();
            //console.log("upgrade func finished");
        }
        console.log("Database initialized");
    }

    /**
     * Create a transaction on the "entries" object store, then execute the func param with that transaction.
     * @param func The async function to execute (usually getObject, putObject, or addObject)
     * @param params Any extra params for the functions
     * @param mode The transaction mode
     * @returns A promise that resolves when the function does
     */
    async execOperation(func: (...args: any[]) => Promise<any>, params: any[], mode: IDBTransactionMode = "readwrite") {
        const promise = new Promise(async (resolve) => {
            // execute the operation
            const transaction = this.db.transaction("entries", mode);
            const objectStore = transaction.objectStore("entries");
            params.push(objectStore);
            const returnVal = await func.apply(null, params);

            resolve(returnVal);
        });
        return promise;
    }

    public async getJournal(id: string) {
        const journal = await this.execOperation(getObject, [id], "readonly");
        return journal as JournalInterface;
    }

    public async createJournal(title: string, type: string): Promise<string> {
        const journal = {
            id: crypto.randomUUID(),
            created: Date.now(),
            title: title,
            type: type,
            content: ""
        }
        const id = await this.execOperation(addObject, [journal]);
        return id as string;
    }

    public async updateJournal(journal: JournalInterface) {
        await this.execOperation(putObject, [journal]);
    }

    public async* listJournals() {
        const transaction = this.db.transaction("entries", "readonly");
        const index = transaction.objectStore("entries").index("created");
    
        const cursor = await openCursor(index);

        while (cursor && cursor.request) {
            yield new Journal(cursor.value.id, this, cursor.value);
            await continueCursor(cursor);
        }
    }

    upgradeDB(event: IDBVersionChangeEvent, db: IDBDatabase, transaction: IDBTransaction, resolve: (value: any) => void) {
        let updateData: () => Promise<any>;
        if (event.oldVersion === 0) { // no database previously
            const objectStore = db.createObjectStore("entries", { keyPath: "id" });
            objectStore.createIndex("created", "created", { unique: false });
            objectStore.createIndex("title", "title", { unique: false });
            objectStore.createIndex("type", "type", { unique: false });
        }
        else if (event.oldVersion === 1) {
            const objectStore = transaction.objectStore("entries");
            objectStore.createIndex("type", "type", { unique: false });
            
            updateData = async () => {
                console.log("updating data");
                for await (const journal of this.listJournals()) {
                    // DO NOT AWAIT, or blocking will happen. This essentially just adds the operation to the IDB transaction queue
                    journal.setType("messages-journal");
                }
            }
        }
        else if (event.oldVersion === 2) {
            updateData = async () => {
                for await (const journal of this.listJournals()) {
                    // Set the journal type to match the new format (but DO NOT AWAIT, otherwise everything will be blocked)
                    journal.setType(`${await journal.getType()}-journal`);
                }
            }
        }
        return updateData
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

export {
    Journal,
    JournalDatabase
}