let cache: Cache;
let installedVersion: string;
const excluded = ["worker.js"];

addEventListener("activate", activateWorker);
addEventListener("fetch", fetchHandler);

async function activateWorker(event: ExtendableEvent) {
    event.waitUntil(cacheInit());
}

async function cacheInit() {
    cache = await caches.open("oceanic");
    await updateCache();
    setInterval(updateCache, 5000);
}

async function updateCache() {
    const currentVersion = await fetch("/build-hash", {method: "GET", cache: "no-store"}).then(resp => resp.text());
    console.log(currentVersion, installedVersion);
    if (currentVersion !== installedVersion) {
        // purge the cache (this is fuckin ugly but I'll fix it later)
        console.log(await caches.delete("oceanic"));
        cache = await caches.open("oceanic");
        console.log(await cache.keys());

        // fetch and parse manifest
        const manifest = await fetch("/manifest.json", {cache: "no-store"}).then(resp=>resp.json()) as Object;
        const files = Object.entries(manifest)
        .map(entry => entry[1])
        .filter((filename) => !(excluded.includes(filename)));
        
        // cache all files from the manifest
        files.forEach(filepath => {
            cache.add(new Request(filepath, {cache: "no-store"}));
        })
        // cache the build hash
        installedVersion = currentVersion;
    }
}

async function fetchHandler(event: FetchEvent) {
    event.respondWith(
        cache.match(event.request)
        .then(match => {
            if (match) {
                console.log(match);
                return match;
            }
            else {
                return fetch(event.request, {method: event.request.method, cache: "no-store"});
            }
        })
    )
}