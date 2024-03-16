import { CognitoIdentityProviderClient, InitiateAuthCommand, InitiateAuthResponse, RespondToAuthChallengeCommand } from "@aws-sdk/client-cognito-identity-provider";
import { formSubmit } from "../../scripts/utils/forms";
import { newPasswordVerifier } from "./verifiers";

declare const cloudConfig: any;

const forms: { [key: string]: HTMLFormElement } = {};
const client = new CognitoIdentityProviderClient({ region: "us-west-2" });

let currentForm: HTMLFormElement;
let formsContainer: HTMLElement;

window.addEventListener("load", _ => {
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
            ClientId: cloudConfig.clientID
        });

        const authResponse = await client.send(initiateCommand) as InitiateAuthResponse;
        
        if (authResponse.ChallengeName) {
            respondToChallenge(authResponse.ChallengeName, formData.get("username").toString(), authResponse.Session);
        }
    } catch (error) {
        console.log(error);
    }
}

async function respondToChallenge(challengeName: string, username: string, session: string) {
    switch (challengeName) {
        case "NEW_PASSWORD_REQUIRED":
            switchForms("new-password");
            newPasswordChallenge(username, session);
            break;
    
        default:
            break;
    }
}

async function newPasswordChallenge(username: string, session: string) {
    // wait for the form to be submitted
    const formData = await formSubmit(forms["new-password"], newPasswordVerifier);
    const challengeRespondCommand = new RespondToAuthChallengeCommand({
        ChallengeName: "NEW_PASSWORD_REQUIRED",
        ClientId: cloudConfig.clientID,
        ChallengeResponses: {
            "USERNAME": username,
            "NEW_PASSWORD": formData.get("password").toString()
        },
        Session: session
    });

    const response = await client.send(challengeRespondCommand);
    console.log(response);
}