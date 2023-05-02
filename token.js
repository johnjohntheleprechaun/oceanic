const authURL = "https://message-journal.auth.us-west-2.amazoncognito.com";
const redirectURI = window.location.origin + "/callback.html";
const clientID = "2ji6bjoqm4p37s1r87t1099n0a";

let token;
function loadToken() {
    let storedToken = window.localStorage.getItem("access_token");
    // prompt for token if one isn't stored, otherwise load the stored token
    if (storedToken === null || storedToken === "" || storedToken === "null") {
        let url = new URL(authURL + "/login");
        let params = new URLSearchParams({
            redirect_uri: redirectURI,
            client_id: clientID,
            response_type: "code"
        });
        url.search = params.toString();
        window.location.href = url.toString();
    }
    else {
        return storedToken;
    }
}