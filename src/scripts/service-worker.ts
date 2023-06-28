// cache version 0 will be used for testing only
// otherwise cache versions should match application versions.
const CACHE_VERSION = 0;
const CACHE_FILES = [
    "home.html", "home.js", "home.css", "icon_add.svg", // journal list
    "journal.html", "journal.js", "journal.css", "icon_send.svg", // journal editor
    "oceanic-quill.svg", "pwa.js" // other stuff
];
let cache: Cache;

addEventListener("fetch", fetchEvent);
addEventListener("activate", activateWorker);
async function activateWorker(event: ExtendableEvent) {
    cache = await loadCache(CACHE_VERSION);
}

async function loadCache(version: number): Promise<Cache> {
    const cacheName = `oceanicV${version}`;
    // delete all caches that aren't of the current version
    const cacheList = await caches.keys();
    for (let cache of cacheList) {
        if (cache !== cacheName) {
            caches.delete(cache);
        }
    }

    return caches.open(cacheName);
}

function fetchEvent(event: FetchEvent) {
    console.log(event);
}