import { DocumentInfo } from "./cloud-types";
import { CryptoUtils } from "./crypto";
import { SecretManager } from "./secrets";
import { SettingsGroup, userSettingsSchema, userSettingsValidator } from "./settings-schemas";
const defaults = require("json-schema-defaults");

/**
 * @deprecated
 */
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
    database: Database
    public static readonly version: number = 1;

    public static async open(): Promise<JournalDatabase> {
        const database = new JournalDatabase();
        await database.init();
        return database;
    }
    async init() {
        await navigator.storage.persist();
        
        this.database = await Database.open("document", JournalDatabase.version, this.upgradeDB);
    }

    public async getJournal(id: string): Promise<JournalInterface> {
        return await this.database.getObject(id, "entries") as JournalInterface;
    }

    public async createJournal(title: string, type: string): Promise<string> {
        const journal = {
            id: crypto.randomUUID(),
            created: Date.now(),
            title: title,
            type: type,
            content: ""
        }
        const id = await this.database.addObject(journal, "entries");
        return id;
    }

    public async updateJournal(journal: JournalInterface): Promise<string> {
        return await this.database.putObject(journal, "entries");
    }

    public async* listJournals() {
        for await (const journal of this.database.listItems("entries", "created")) {
            yield new Journal(journal.id, this, journal);
        }
    }

    private upgradeDB(event: IDBVersionChangeEvent, db: IDBDatabase, transaction: IDBTransaction): () => Promise<any> {
        let updateData: () => Promise<any>;

        if (event.oldVersion === 0) {
            const infoStore = db.createObjectStore("info", { keyPath: "id" });
            infoStore.createIndex("created", "created");
            infoStore.createIndex("updated", "updated");
            db.createObjectStore("content");
            db.createObjectStore("attachments");
            updateData = this.migrate;
        }

        return updateData;
    }

    /**
     * Migrate from the old journal database to the new document database
     */
    private async migrate() {
        // step one, get a keypair for encryption
        const keyPair = await CryptoUtils.generateKeyPair();
        await SecretManager.storeMasterKeyPair(keyPair);
        const userId = crypto.randomUUID();

        // now go through the journals and pull them apart to store in the separate stores of the new DB
        const journalDatabase = await Database.open("journal", 3, this.oldUpgradeDB); // v3 was the latest version
        for await (const journal of journalDatabase.listItems("entries")) {
            const documentKey = await CryptoUtils.generateSymmetricKey();
            // Create the document info object and store it in the info object store
            const document: DocumentInfo = {
                user: userId,
                id: journal.id,
                title: journal.title,
                type: journal.type,
                created: journal.created,
                updated: journal.created,
                attachments: [],
                documentKey: await CryptoUtils.wrapDocumentKey(documentKey),
                authorizedUsers: []
            };
            await this.database.putObject(document, "info");

            // encrypt the journal content and put it in the content store
            const encodedContent = CryptoUtils.encode(journal.content);
            const encryptedContent = await CryptoUtils.encrypt(encodedContent, documentKey);
            await this.database.putObject(encryptedContent, "content", journal.id);
        }

        // now that you've finished with the old database, delete it
        journalDatabase.db.close();
        window.indexedDB.deleteDatabase("journal");
    }

    /**
     * The old upgrade func, from back before cloud stuff.
     * @deprecated
     */
    private oldUpgradeDB(event: IDBVersionChangeEvent, db: IDBDatabase, transaction: IDBTransaction): () => Promise<any> {
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


export const userDatabaseVersion = 1;
export function userDatabaseUpgrade(event: IDBVersionChangeEvent, database: IDBDatabase, transaction: IDBTransaction) {
    let dataMutator: () => Promise<any>;
    switch (event.oldVersion) {
        case 0:
            // first time initialization
            const userDataStore = database.createObjectStore("data");
            const userSecretStore = database.createObjectStore("secrets");
            break;
    }

    return dataMutator;
}

type UpgradeController = (event: IDBVersionChangeEvent, db: IDBDatabase, transaction: IDBTransaction) => (() => Promise<any>)

/**
 * A wrapper for an IndexedDB Database
 */
class Database {
    /**
     * Create a new Database object and initialize it
     * @param name The name of the database
     * @param version The database version
     * @param upgradeFunc The function to call if an upgrade is needed
     * @returns The fully initialized database
     */
    public static async open(name: string, version: number, upgradeFunc: UpgradeController) {
        const database = new Database();
        await database.init(name, version, upgradeFunc);
        return database;
    }

    db: IDBDatabase;

    /**
     * Initialize a database object that's already been created. You should probably be using the static method `Database.open()`
     * @param name The IDB Database name
     * @param version The Database version
     * @param upgrade The upgrade function
     */
    async init(name: string, version: number, upgrade: UpgradeController) {
        await navigator.storage.persist();
        const dbRequest = window.indexedDB.open(name, version);
        
        let dataMutatorFunc: () => Promise<any>;
        await new Promise((resolve, reject) => {
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
                dataMutatorFunc = upgrade(event, dbRequest.result, dbRequest.transaction);
            };
        });
        //console.log("initialize promise finished");
        if (dataMutatorFunc) {
            await dataMutatorFunc();
            //console.log("upgrade func finished");
        }
        console.log("Database initialized");
    }

    /**
     * Create a transaction and open an object store
     * @param storeName The name of the object store
     * @param write Whether it needs to be used for writing
     * @returns The specified object store
     */
    openStore(storeName: string, write?: boolean): IDBObjectStore {
        const transaction = this.db.transaction(
            storeName, write ? "readwrite" : "readonly"
        );
        return transaction.objectStore(storeName);
    }

    /**
     * Create a readonly trasaction and open and index on an object store
     * @param storeName The name of the object store
     * @param indexName The name of the index that's on the object store
     * @returns The specified index
     */
    openIndex(storeName: string, indexName: string): IDBIndex {
        const objectStore = this.openStore(storeName);
        return objectStore.index(indexName);
    }

    /**
     * This simply makes the index optional, since indexes and object stores share methods for reading
     * @param storeName The name of the object store
     * @param indexName An optional index name. If it's not provided, then only an object store will be opened
     * @param write Whether it will be used for object writes. Nore 
     * @returns The specified object store or index
     */
    openStoreOrIndex(storeName: string, indexName?: string, write?: boolean): IDBObjectStore | IDBIndex {
        return indexName ? this.openIndex(storeName, indexName) : this.openStore(storeName, write);
    }

    /**
     * List all the items in an index or object store
     * @param storeName The name of the object store
     * @param indexName The name of the index
     */
    public async* listItems(storeName: string, indexName?: string): AsyncGenerator<any, void, unknown> {
        const cursor = await this.openCursor(storeName, indexName);
        
        while (cursor && cursor.value && cursor.request) {
            yield cursor.value;
            await this.continueCursor(cursor);
        }
    }

    public async listAllKeys(storeName: string, indexName?: string) {
        return new Promise((resolve, reject) => {
            const index = this.openStoreOrIndex(storeName, indexName);
            const request = index.getAllKeys();

            request.onsuccess = function() {
                resolve(request.result);
            }
            request.onerror = function() {
                reject(request.error);
            }
        });
    }

    /**
     * Continue a cursor object
     * @param cursor The cursor to continue
     * @returns The cursor that was continued. The same object as the one passed into the method
     */
    async continueCursor(cursor: IDBCursor) {
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
    
    /**
     * Open a cursor on a specified index or object store
     * @param storeName The name of the object store
     * @returns A cursor with value
     */
    async openCursor(storeName: string, indexName?: string): Promise<IDBCursorWithValue> {
        const store = this.openStoreOrIndex(storeName, indexName);
        return new Promise((resolve, reject) => {
            const request = store.openCursor();
    
            // bind functions
            request.onsuccess = function() {
                resolve(request.result);
            };
            request.onerror = function() {
                reject(request.error);
            };
        });
    }
    
    /**
     * Get an object from an object store or index
     * @param key The key for the object
     * @param storeName The name of the object store
     * @param indexName The name of an index
     * @returns The object associated with the key
     */
    async getObject(key: string, storeName: string, indexName?: string): Promise<any> {
        const store = this.openStoreOrIndex(storeName, indexName);
        return new Promise((resolve, reject) => {
            // add an empty journal entry
            const addRequest = store.get(key);
    
            // add event listeners
            addRequest.onsuccess = function() {
                resolve(addRequest.result);
            };
            addRequest.onerror = function() {
                reject(addRequest.error);
            };
        });
    }
    
    /**
     * Put an object in an object store (or update it if it already exists)
     * @param newData The new object
     * @param storeName The name of the object store
     * @param key The object's key
     * @returns The key for the object
     */
    async putObject(newData: any, storeName: string, key?: IDBValidKey): Promise<string> {
        const store = this.openStore(storeName, true);

        return new Promise((resolve, reject) => {
            // put the data
            const addRequest = store.put(newData, key);
    
            // add event listeners
            addRequest.onsuccess = function() {
                // resolve with the object key
                resolve(addRequest.result.toString());
            };
            addRequest.onerror = function() {
                reject(addRequest.error);
            };
        });
    }
    
    /**
     * Create a new object in an object store. This will fail if the key is already being used
     * @param object The new object
     * @param storeName The name of the object store
     * @param key The object's key
     * @returns The object key
     */
    async addObject(object: any, storeName: string, key?: IDBValidKey): Promise<string> {
        const store = this.openStore(storeName, true);

        return new Promise((resolve, reject) => {
            // attempt to add the object
            const addRequest = store.add(object, key);
    
            // add event listeners
            addRequest.onsuccess = function() {
                resolve(addRequest.result.toString());
            };
            addRequest.onerror = function() {
                reject(addRequest.error);
            };
        });
    }
}

export {
    Journal,
    JournalDatabase,
    Database
}