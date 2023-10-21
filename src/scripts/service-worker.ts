let cache: Cache;
let installedVersion: string;

addEventListener("activate", activateWorker);
addEventListener("fetch", fetchHandler);

async function activateWorker(event: ExtendableEvent) {
    event.waitUntil(cacheInit().then(()=>clients.claim()));
}

async function cacheInit() {
    cache = await caches.open("oceanic");
    await updateCache();
    setInterval(updateCache, 600000);
}

async function updateCache() {
    const buildHash = await fetch("/build-hash", {method: "GET", cache: "no-store"});
    console.log(buildHash);
    console.log(buildHash.body);
    if (buildHash.status !== 200) {
        // failed to fetch buildHash
        return;
    }
    const currentVersion = await buildHash.text();
    console.log(currentVersion, installedVersion);
    if (currentVersion !== installedVersion) {
        // purge the cache (this is fuckin ugly but I'll fix it later)
        console.log(await caches.delete("oceanic"));
        cache = await caches.open("oceanic");
        console.log(await cache.keys());

        // fetch and parse manifest
        const manifest = await fetch("/manifest.json", {cache: "no-store"}).then(resp=>resp.json()) as Object;
        console.log(manifest);
        const files = Object.entries(manifest).map(entry => entry[1]);
        
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