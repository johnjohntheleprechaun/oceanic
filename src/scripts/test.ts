async function test() {
    console.log("hello world");
    fetch(window.location.origin + "/test")
    .then(out => console.log(out));
}

test();