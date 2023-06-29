window.addEventListener("load", () => {
    if ('serviceWorker' in navigator && 'PushManager' in window && 'matchMedia' in window) {
        console.log("PWA is supported");
        registerWorker();
    }
})

function registerWorker() {
    navigator.serviceWorker.register("/worker.js").then(registration => {
        console.log("service worker registered with scope: ", registration.scope);
    });
}