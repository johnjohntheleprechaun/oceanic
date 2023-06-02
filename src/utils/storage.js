var storage;

async function init() {
    storage = await navigator.storage.getDirectory();
}

async function readFile(path) {
    const handle = await storage.getFileHandle(path, {create: false})
    const file = await handle.getFile();

    return file.text();
}

async function writeFile(path, contents, create=true) {
    const handle = await storage.getFileHandle(path, {create: create});
    const stream = await handle.createWritable();

    await stream.write(contents);
    return stream.close();
}