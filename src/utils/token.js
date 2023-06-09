import jwt_decode from "jwt-decode"
const authURL = "https://oceanic.auth.us-west-2.amazoncognito.com";
const redirectURI = window.location.origin + "/callback.html";
const clientID = "jh6lo44rv24ntbg0v16o0k15a";

export function checkToken(token) {
    let decoded;
    // attempt to decode
    try {
        decoded = jwt_decode(token);
    } catch {
        return false;
    }

    // check token expiration
    if (decoded.exp < Date.now() / 1000) {
        return false;
    }

    return true;
}

export async function refresh_tokens() {
    let refresh_token = window.localStorage.getItem("refresh_token");
    return await fetch(authURL + "/oauth2/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
            grant_type: "refresh_token",
            client_id: clientID,
            redirect_uri: redirectURI,
            refresh_token: refresh_token
        })
    })
    .then(response => response.json())
    .then(data => save_tokens(data));
}

export function save_tokens(data) {
    if (data.error === "invalid_grant") {
        login();
    }
    // save tokens to local storage
    window.localStorage.setItem("id_token", data.id_token);
    window.localStorage.setItem("access_token", data.access_token);
    if (data.refresh_token) { // only if data includes a refresh token (like on callback)
        window.localStorage.setItem("refresh_token", data.refresh_token);
    }
}

export function login() {
    // redirect to cognito hosted UI login
    let url = new URL(authURL + "/login");
    let params = new URLSearchParams({
        redirect_uri: redirectURI,
        client_id: clientID,
        response_type: "code"
    });
    url.search = params.toString();
    window.location.href = url.toString();

}