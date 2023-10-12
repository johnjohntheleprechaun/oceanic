async function test() {
    const manifest = await fetch("manifest.json").then(resp=>resp.json()) as Object;
    const files = Object.entries(manifest).map(entry=>entry[1]);
    console.log(files);
}

test();