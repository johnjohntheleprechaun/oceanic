declare const cloudConfig: any;

async function test() {
    await fetch(cloudConfig.apiEndpoint + "users/register", {
        headers: {
            "Authorization": `Bearer ${window.localStorage.getItem("id_token")}`
        },
        method: "POST"
    }).then(resp => resp.json())
    .then(json => console.log(json));
}

export {test}