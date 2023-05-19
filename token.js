import { decode } from "jsonwebtoken";
const authURL = "https://message-journal.auth.us-west-2.amazoncognito.com";
//const redirectURI = window.location.origin + "/callback.html";
const clientID = "2ji6bjoqm4p37s1r87t1099n0a";

const tokens = {
    id: "eyJraWQiOiJSeUoxZm9YWm9OVFwvTWtac0FRbGtlTTZkUHBaWUc1OG9Cd0ZGNGVTOWsrQT0iLCJhbGciOiJSUzI1NiJ9.eyJhdF9oYXNoIjoibFpwLUdqanhxaHJkaDJlbjVlRVRqUSIsInN1YiI6IjQ0MzQ3MmM5LTRlMzAtNDRjMC1iOWNlLThhYzE4YzQ5NjMyZCIsImNvZ25pdG86Z3JvdXBzIjpbIm93bmVyIl0sImNvZ25pdG86cHJlZmVycmVkX3JvbGUiOiJhcm46YXdzOmlhbTo6MDg3MTkxNzU4MTA3OnJvbGVcL2pvdXJuYWwtb3duZXIiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtd2VzdC0yLmFtYXpvbmF3cy5jb21cL3VzLXdlc3QtMl9INnl1Uk5ibGkiLCJjb2duaXRvOnVzZXJuYW1lIjoiSm9obm55X1RodW5kZXIiLCJvcmlnaW5fanRpIjoiOGQzMzliNGEtZGU3Zi00ZTgzLWE3YTQtZTE2OGM0NmU2N2NiIiwiY29nbml0bzpyb2xlcyI6WyJhcm46YXdzOmlhbTo6MDg3MTkxNzU4MTA3OnJvbGVcL2pvdXJuYWwtb3duZXIiXSwiYXVkIjoiMmppNmJqb3FtNHAzN3Mxcjg3dDEwOTluMGEiLCJ0b2tlbl91c2UiOiJpZCIsImF1dGhfdGltZSI6MTY4NDMyNjg3MCwiZXhwIjoxNjg0MzMwNDcwLCJpYXQiOjE2ODQzMjY4NzAsImp0aSI6IjQ0ZjZhZGJhLWI2OTgtNDYwMC04NTk5LWM4NjJlOWZhNzcyMiIsImVtYWlsIjoiam9obkBqb3JnZW5zZW5mYW1pbHkudXMifQ.Pbd0E2Pz4Bjs7l474eBQ5LiAMR8t6RfsRsJ5DumFNgtHfdRuC9B-qQD4gLN4y4Kl-8qovNaVg95xUZpUFgb_cPV7ZM2euNqIayUn93wNvn-dL1bmONAmjPOOPH9f7kJreX9iL6sYzHsfpgiB9k7AbDBD-9-BX2SOeHayO3-OPauxYEUaLVGjwiLkrSe7Y75LYisBTnSwN3xtNAhw_RYMeJ0-6bsahXSOgOvWTT1oEmejWnC-vz3_kgXAggsSmsX6_lWcSIKKcRpY1i_UA-4ZcWdTZVxrCrR4kFN63uQzkyQDV0E2b6vZM9ZV7TegwfuIEQCpSES2MyxtzMnGj8Rxrw",
    refresh: "eyJjdHkiOiJKV1QiLCJlbmMiOiJBMjU2R0NNIiwiYWxnIjoiUlNBLU9BRVAifQ.GWdvy-Nv14tw-c8JvGu3O-DCLII1vtqgBhjEUy0zpfRFZvV9wv4fuGpbXJDGdOvvWa5S4L7uB961FS73bHyyTdJv2R6rzQ8RnxEHxqMGjrbY0JcE2uDfmP8ZOMM6YGq-kgntW_kJTuCpAgs--27-iT7mYHloBh8dMdpofHiyfVs3fkK3WFDfP8t4M5RSHnXUR_BVbVCQKvHn-Z9Ox1nbQ5SelcxVqgl4RUzc4BfY1W6X9Xjf1fn3aizbjEtaAGVPjHtZcm4ErHXkascptYptQ5bs7pmNzvkUUgi0efUq8WD7iGMWMT9JKCktJmBc7wD92_QoVdFeBbiCHiLXHbVh1A.LuNUTkSzwKn1fHRY.EynAqsOhZWONPufb5j-dtSbCoHuCqCnAWFtVgXK4E5Pz1IZqOT8vfgA1GQUCUbe-KdQgJfSR5cjV_ooLPsFwck7dfzcEhUNSHAebeCVpHbpjpD0U42_aQp-U2GDgztkSJyBAA_7u6wSnhtenjHgWqyDYmDKcTAbB5B1Zc2yl6cv0Ch7XleVeIYjJFMCNKU_ffAkLwIcIOUDc8wTNYd6Y2d6lqiTuB22nFjnzdYCx9PSesgcQx6rp8GPlZ-WAcaUkdtj35ZLhi-RM9NKSQx3bWBFSRlARYb__O-f7q9hXKLOy1I_8Nipf__RGj7XcVGJ01kfW3fm4UFGgSqTxVWWlKo3t08ynbrDwDbW5Ra-BcD2GJBdYUc6B_Kfbs7Sh-KVA0drf330awUXisQ_ZUe7qq4Ie46GrPUCNs2qrrtiafZnp-X70UiOjNPKtArPLxOYsrRfA38St9Mi-8dyOYtEmBna0_MIPyuImPTz-tqPe69H5sb1Vq5zc9IyrT92nxZvjM0wRFpAfvMQwFsXdB8QVnULGa6VuLTFb_qyqDSiup2RQ17QUcrP4y2-5r94b33jVN_QFpEXCw7lp1vXej6wCo5eBc1iccBW83ZVQLwXRvRyQD4XTRUIzU91Um5CGv06PtikFwGNKb2mmssSyZZKPjj2RdvHOQbc4HlOnQoUoQvIC4lR37gRZb-NjNg90UPKxRlAd_dbSvp6tHWXw480CWxCKxVZl7K9FWEtVB_D8dUqUonNsgT4iLlRUUF7mDrM2fdFlwabLl-CD134HE8q4Tciqj6OpL2p69a-lVTKeydQsGJ4GYuUfq1GRLoO8G4Sx_twXQSs3QPRzlW5lqPqjgSSAeBjJolNJ-Vey0aypPiHnD4w_-rry4o65q7MwHTQQpfiJ7Yt0DXRY7oebh-FiW0Z-x_xvhyIlvbwIbJah3twKRDNiP_ld1DBVU4G3CdeQWLyHLuwJlIDLLx4HCEY4e1WfynoQ3FrrwwaxMreKgsNjBQLztpxKaMJHbTEuDcdB9aVt6FKF4dAs2ZbafRUEbW0h5DhISwLIVdUfp-OEK2EP02t1QI4qziWDFvxOKj2hobpaAkRN2UnYy-flEgpB4SFogenpwSHMurC6nSBRK-WU8oqEITgNocG_oojRCBbXX79hPRxglnamzM_MenABNlNR1dxXjm6BkfCTacrQ0j4cfHqXmwAFf3afbFG5hThpq7mwv6ejnzE.V8KAJVT_Sw4A2xmRGVXV8A"
}


export function loadTokens() {
    return {
        id: window.localStorage.getItem("id_token"),
        access: window.localStorage.getItem("access_token"),
        refresh: window.localStorage.getItem("refresh_token")
    };
}

// check access and id tokens (NOT refresh)
export function checkTokens(tokens) {
    // decode tokens
    const id = decode(tokens.id);
    const access = decode(tokens.access);

    // check if JWTs are valid (decode returns null if JWT is invalid)
    if (!id || !access) {
        return false;
    }

    // check if JWTs are expired
    const now = Date.now() / 1000;
    if (id.exp < now || access.exp < now) {
        return false;
    }
    return true;
}

export async function refresh_tokens(refresh_token) {
    return fetch(authURL + "/oauth2/token", {
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
    // save tokens to local storage
    window.localStorage.setItem("id_token", data.id_token);
    window.localStorage.setItem("access_token", data.access_token);
    window.localStorage.setItem("refresh_token", data.refresh_token);

    // return formatted tokens
    return {
        id: data.id_token,
        access: data.access_token,
        refresh: data.refresh_token
    };
}