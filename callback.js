const authCode = new URLSearchParams(window.location.search).get("code");

fetch(authURL + "/oauth2/token", {
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

function writeTokens(data) {
    window.localStorage.setItem("access_token", data.access_token);
    window.localStorage.setItem("refresh_token", data.refresh_token);
}