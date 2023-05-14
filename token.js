const authURL = "https://message-journal.auth.us-west-2.amazoncognito.com";
const redirectURI = window.location.origin + "/callback.html";
const clientID = "2ji6bjoqm4p37s1r87t1099n0a";

function getAccessToken() {
    return window.localStorage("access_token");
}
function getIDToken() {
    return window.localStorage("id_token");
}
function getRefreshToken() {
    return window.localStorage("refresh_token");
}

function checkTokens() {
    return getAccessToken() && getIDToken() && getRefreshToken();
}

function login() {
    let url = new URL(authURL + "/login");
    let params = new URLSearchParams({
        redirect_uri: redirectURI,
        client_id: clientID,
        response_type: "code"
    });
    url.search = params.toString();
    window.location.href = url.toString();
}

login();