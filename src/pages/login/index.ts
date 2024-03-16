import { CognitoIdentityProviderClient, InitiateAuthCommand, InitiateAuthResponse } from "@aws-sdk/client-cognito-identity-provider";

declare const cloudConfig: any;

let loginForm: HTMLFormElement;
let client: CognitoIdentityProviderClient;
window.addEventListener("load", _ => {
    console.log(cloudConfig);
    loginForm = document.getElementById("login") as HTMLFormElement;
    loginForm.addEventListener("submit", login);
    client = new CognitoIdentityProviderClient({ region: "us-west-2" });
});

async function login(event: SubmitEvent) {
    event.preventDefault();
    const formData = new FormData(loginForm);
    try {
        const initiateCommand = new InitiateAuthCommand({
            AuthFlow: "USER_PASSWORD_AUTH",
            AuthParameters: {
                USERNAME: formData.get("username").toString(),
                PASSWORD: formData.get("password").toString()
            },
            ClientId: cloudConfig.clientID
        });

        const initiateResponse = await client.send(initiateCommand) as InitiateAuthResponse;
        console.log(initiateResponse);
    } catch {

    }
}