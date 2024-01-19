window.addEventListener("load", async () => {
    if ('serviceWorker' in navigator && 'PushManager' in window && 'matchMedia' in window) {
        console.log("PWA is supported");
        await registerWorker();
    }
});

async function registerWorker() {
    const manifest = await fetch("/manifest.json").then(resp => resp.json());
    await navigator.serviceWorker.register("/" + manifest["worker.js"]).then(registration => {
        console.log("service worker registered with scope: ", registration.scope);
    });
}