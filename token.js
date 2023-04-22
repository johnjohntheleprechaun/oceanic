let token;
function loadToken() {
    let storedToken = window.localStorage.getItem("token");
    // prompt for token if one isn't stored, otherwise load the stored token
    if (storedToken === null || storedToken === "" || storedToken === "null") {
        let input = prompt("No token is saved, please enter one now");
        window.localStorage.setItem("token", input);
        return input
    }
    else {
        return window.localStorage.getItem("token");
    }
}