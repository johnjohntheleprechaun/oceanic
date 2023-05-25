const authURL = "https://message-journal.auth.us-west-2.amazoncognito.com";
const redirectURI = window.location.origin + "/callback.html";
const clientID = "2ji6bjoqm4p37s1r87t1099n0a";

function getTokens() {
    const authCode = new URLSearchParams(window.location.search).get("code");
    console.log("get");

    return fetch(authURL + "/oauth2/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
            grant_type: "authorization_code",
            client_id: clientID,
            redirect_uri: redirectURI,
            code: authCode
        })
    })
    .then(response => response.json())
    .then(data => writeTokens(data));
}

function writeTokens(data) {
    window.localStorage.setItem("id_token", data.id_token);
    window.localStorage.setItem("access_token", data.access_token);
    window.localStorage.setItem("refresh_token", data.refresh_token);
}

window.addEventListener("load", getTokens());