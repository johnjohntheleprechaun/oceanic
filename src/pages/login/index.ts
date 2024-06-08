import { AssociateSoftwareTokenCommand, AuthenticationResultType, CognitoIdentityProviderClient, GetUserCommand, InitiateAuthCommand, InitiateAuthResponse, RespondToAuthChallengeCommand, VerifySoftwareTokenCommand } from "@aws-sdk/client-cognito-identity-provider";
import { formSubmit } from "../../scripts/utils/forms";
import { newPasswordVerifier } from "./verifiers";
import { toCanvas } from "qrcode";
import { CloudConfig } from "../../scripts/utils/cloud-config";
import { SecretManager } from "../../scripts/utils/secrets";
import { CloudConnection } from "../../scripts/utils/aws";

declare const cloudConfig: CloudConfig;

const forms: { [key: string]: HTMLFormElement } = {};
const authEndpoint = cloudConfig.apiEndpoint + "/auth";
const client = new CognitoIdentityProviderClient({ region: "us-west-2" });
console.log(authEndpoint)

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
        const initiateCommand = {
            AuthFlow: "USER_PASSWORD_AUTH",
            AuthParameters: {
                USERNAME: formData.get("username").toString(),
                PASSWORD: formData.get("password").toString()
            },
            ClientId: cloudConfig.clientId
        };
        const response = await fetch(authEndpoint, {
            body: JSON.stringify(initiateCommand),
            method: "POST",
            headers: {
                "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
                "Content-Type": "application/x-amz-json-1.1"
            }
        }).then(resp => resp.json());
        console.log(response);
        
        if (response.ChallengeName) {
            await respondToChallenge(response.ChallengeName, response.ChallengeParameters, formData.get("username").toString(), response.Session);
        } else {
            await finishLogin(response.AuthenticationResult);
        }

        await SecretManager.storeMasterKeyPair(
            await CloudConnection.getMasterKeyPair(formData.get("password").toString())
        );
        window.location.href = "/test.html";
    } catch (error) {
        console.log(error);
    }
}

async function respondToChallenge(challengeName: string, challengeParams: Record<string, string>, username: string, session: string) {
    switch (challengeName) {
        case "NEW_PASSWORD_REQUIRED":
            await newPasswordChallenge(username, session, challengeParams);
            break;
        case "MFA_SETUP":
            mfaSetupChallenge(username, session);
            break;
        case "SOFTWARE_TOKEN_MFA":
            otpMfaChallenge(username, session);
            break;
        default:
            break;
    }
}

async function finishLogin(authResult: AuthenticationResultType) {
    await SecretManager.storeTokens(authResult.AccessToken, authResult.IdToken, authResult.RefreshToken);
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
    const challengeRespondCommand = {
        ChallengeName: "NEW_PASSWORD_REQUIRED",
        ClientId: cloudConfig.clientId,
        ChallengeResponses: {
            "USERNAME": username,
            "NEW_PASSWORD": formData.get("password").toString(),
            "userAttributes.email": email
        },
        Session: session
    };

    const response = await fetch(authEndpoint, {
        body: JSON.stringify(challengeRespondCommand),
        headers: {
            "X-Amz-Target": "AWSCognitoIdentityProviderService.RespondToAuthChallenge",
            "Content-Type": "application/x-amz-json-1.1"
        }
    }).then(resp => resp.json());
    //console.log(response);

    if (response.ChallengeName) {
        await respondToChallenge(response.ChallengeName, response.ChallengeParameters, username, response.Session);
    } else {
        await finishLogin(response.AuthenticationResult);
    }
}

/**
 * So technically this could be used but there's some Cognito bullshit stopping me from getting tokens after setting it up sooooo yeah no
 * @param username 
 * @param session 
 */
async function mfaSetupChallenge(username: string, session: string) {
    switchForms("mfa-setup");
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
    const confirmOtpResponse = await client.send(confirmOtpCommand);
    

    // Now respond to auth with the challenge, supposedly
    const challengeResponse = {
        ChallengeName: "MFA_SETUP",
        ClientId: cloudConfig.clientId,
        Session: confirmOtpResponse.Session,
        ChallengeResponses: {
            "USERNAME": username
        }
    };
    const response = await fetch(authEndpoint, {
        body: JSON.stringify(challengeResponse),
        headers: {
            "X-Amz-Target": "AWSCognitoIdentityProviderService.RespondToAuthChallenge",
            "Content-Type": "application/x-amz-json-1.1"
        }
    }).then(resp => resp.json());
    if (response.ChallengeName) {
        respondToChallenge(response.ChallengeName, response.ChallengeParameters, username, response.Session);
    } else {
        finishLogin(response.AuthenticationResult);
    }
}

async function otpMfaChallenge(username: string, session: string) {
    switchForms("otp-mfa");
    const form = await formSubmit(forms["otp-mfa"]);
    const code = form.get("code").toString();

    const challengeResponse = {
        ChallengeName: "SOFTWARE_TOKEN_MFA",
        ClientId: cloudConfig.clientId,
        ChallengeResponses: {
            "USERNAME": username,
            "SOFTWARE_TOKEN_MFA_CODE": code
        },
        Session: session
    };
    const response = await fetch(authEndpoint, {
        body: JSON.stringify(challengeResponse),
        headers: {
            "X-Amz-Target": "AWSCognitoIdentityProviderService.RespondToAuthChallenge",
            "Content-Type": "application/x-amz-json-1.1"
        }
    }).then(resp => resp.json());
    if (response.ChallengeName) {
        respondToChallenge(response.ChallengeName, response.ChallengeParameters, username, response.Session);
    } else {
        finishLogin(response.AuthenticationResult);
    }
}