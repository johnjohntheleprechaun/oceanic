// cache version 0 will be used for testing only
// otherwise cache versions should match application versions.
const CACHE_VERSION = 0;
const CACHE_FILES = [
    "/home.html", "/home.js", "/icon_add.svg", // journal list
    "/journal.html", "/journal.js", "/icon_send.svg", // journal editor
    "/oceanic-quill.svg" // other stuff
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

    // cache all required files if there's a new version (or if test)
    let cache = await caches.open(cacheName);
    if (cacheList.length === 0 || version === 0) {
        for (let file of CACHE_FILES) {
            await cache.add(file);
        }
    }

    return cache;
}

function fetchEvent(event: FetchEvent) {
    event.respondWith(
      caches.match(event.request).then(function(match) {
        if (match) {
          console.log("Responded from cache");
          return match;
        }
        return fetch(event.request);
      })
    );
  }
  