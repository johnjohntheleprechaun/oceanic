var storage;

async function init() {
    storage = await navigator.storage.getDirectory();
}

async function readFile(path) {
    return storage.getFileHandle(path, {create: false})
    .then(handle => handle.getFile())
    .then(file => file.text());
}

async function writeFile(path, contents, create=true) {
    return storage.getFileHandle(path, {create: create})
    .then(handle => handle.createWritable())
    .then(stream => stream.write(contents))
}