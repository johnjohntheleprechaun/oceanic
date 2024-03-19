import { AssociateSoftwareTokenCommand, AuthenticationResultType, CognitoIdentityProviderClient, GetUserCommand, InitiateAuthCommand, InitiateAuthResponse, RespondToAuthChallengeCommand, VerifySoftwareTokenCommand } from "@aws-sdk/client-cognito-identity-provider";
import { formSubmit } from "../../scripts/utils/forms";
import { newPasswordVerifier } from "./verifiers";
import { toCanvas } from "qrcode";

declare const cloudConfig: any;

const forms: { [key: string]: HTMLFormElement } = {};
const client = new CognitoIdentityProviderClient({ region: "us-west-2" });

let currentForm: HTMLFormElement;
let formsContainer: HTMLElement;

window.addEventListener("load", _ => {
    console.log(cloudConfig);
    // load all the forms
    formsContainer = document.getElementById("forms-container");
    for (const child of Array.from(formsContainer.getElementsByTagName("form"))) {
        forms[child.id] = child as HTMLFormElement;
    }
    forms["login"].addEventListener("submit", login);
    // this is just hardcoded, so be careful if you decide to reuse this shit
    currentForm = forms["login"];
});

/**
 * display a new form and hide the current one with an animation
 * @param formIds the id of the new form to display
 */
function switchForms(formId: string) {
    // fetch the old height for animation purposes
    const oldHeight = formsContainer.offsetHeight;
    
    // animate the current form off to the left
    currentForm.classList.toggle("center", false);
    currentForm.classList.toggle("left", true);
    currentForm.classList.toggle("hidden", true);

    // bring in the new form
    const newForm = forms[formId];
    newForm.classList.toggle("center", true);
    newForm.classList.toggle("right", false);
    newForm.classList.toggle("hidden", false);

    // calculate the new (target) height 
    formsContainer.style.height = "fit-content";
    const newHeight = formsContainer.offsetHeight;

    // explicitly set height to the old height
    formsContainer.style.height = `${oldHeight}px`;
    window.setTimeout(() => {
        // animate to the target height
        formsContainer.style.height = `${newHeight}px`;
    });
    // hide the old form
    const current = currentForm;
    window.setTimeout(() => current.style.display = "none", 300);
    currentForm = newForm;
}

async function login(event: SubmitEvent) {
    event.preventDefault();
    const formData = new FormData(forms["login"]);
    try {
        const initiateCommand = new InitiateAuthCommand({
            AuthFlow: "USER_PASSWORD_AUTH",
            AuthParameters: {
                USERNAME: formData.get("username").toString(),
                PASSWORD: formData.get("password").toString()
            },
            ClientId: cloudConfig.clientId
        });

        const authResponse = await client.send(initiateCommand) as InitiateAuthResponse;
        console.log(authResponse);
        
        if (authResponse.ChallengeName) {
            respondToChallenge(authResponse.ChallengeName, authResponse.ChallengeParameters, formData.get("username").toString(), authResponse.Session);
        } else {
            finishLogin(authResponse.AuthenticationResult);
        }
    } catch (error) {
        console.log(error);
    }
}

async function respondToChallenge(challengeName: string, challengeParams: Record<string, string>, username: string, session: string) {
    switch (challengeName) {
        case "NEW_PASSWORD_REQUIRED":
            newPasswordChallenge(username, session, challengeParams);
            break;
        default:
            break;
    }
}

async function finishLogin(authResult: AuthenticationResultType) {
    window.localStorage.setItem("id_token", authResult.IdToken);
    window.localStorage.setItem("access_token", authResult.AccessToken);
    window.localStorage.setItem("refresh_token", authResult.RefreshToken);
    const getUser = new GetUserCommand({ AccessToken: authResult.AccessToken });
    const user = await client.send(getUser);
    window.localStorage.setItem("user_data", JSON.stringify(user));
    window.location.href = "/test.html";
}

async function newPasswordChallenge(username: string, session: string, challengeParams: Record<string, string>) {
    const extraAttributes = JSON.parse(challengeParams["requiredAttributes"]) as Array<string>;
    let email: string;
    if (extraAttributes.includes("userAttributes.email")) {
        // get the users email
        switchForms("email");
        email = (await formSubmit(forms["email"])).get("email").toString();
    }
    // wait for the form to be submitted
    switchForms("new-password");
    const formData = await formSubmit(forms["new-password"], newPasswordVerifier);
    const challengeRespondCommand = new RespondToAuthChallengeCommand({
        ChallengeName: "NEW_PASSWORD_REQUIRED",
        ClientId: cloudConfig.clientId,
        ChallengeResponses: {
            "USERNAME": username,
            "NEW_PASSWORD": formData.get("password").toString(),
            "userAttributes.email": email
        },
        Session: session
    });

    const response = await client.send(challengeRespondCommand);
    console.log(response);

    if (response.ChallengeName) {
        respondToChallenge(response.ChallengeName, response.ChallengeParameters, username, response.Session);
    } else {
        finishLogin(response.AuthenticationResult);
    }
}

/**
 * So technically this could be used but there's some Cognito bullshit stopping me from getting tokens after setting it up sooooo yeah no
 * @param username 
 * @param session 
 */
async function mfaSetupChallenge(username: string, session: string) {
    const qrCanvas = forms["mfa-setup"].getElementsByTagName("canvas").item(0);
    console.log("setup");
    const setupCommand = new AssociateSoftwareTokenCommand({ Session: session });
    const setupResponse = await client.send(setupCommand);

    console.log(setupResponse.SecretCode);
    const otpDataUri = `otpauth://totp/Oceanic: ${username}?secret=${setupResponse.SecretCode}`;
    await toCanvas(qrCanvas, otpDataUri, { width: formsContainer.clientWidth });

    const code = (await formSubmit(forms["mfa-setup"])).get("code").toString();
    const confirmOtpCommand = new VerifySoftwareTokenCommand({
        Session: setupResponse.Session,
        UserCode: code
    });
    const confirmOtpResponse = client.send(confirmOtpCommand);
    console.log(confirmOtpResponse);
}