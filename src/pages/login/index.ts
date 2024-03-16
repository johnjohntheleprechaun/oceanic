import { CognitoIdentityProviderClient, InitiateAuthCommand, InitiateAuthResponse } from "@aws-sdk/client-cognito-identity-provider";

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

    document.getElementById("animate").addEventListener("click", _ => {
        switchForms(forms["new-password"]);
    });
    document.getElementById("animate1").addEventListener("click", _ => {
        switchForms(forms["login"]);
    });
});

/**
 * display a new form and hide the current one with an animation
 * @param newForm the new form to display
 */
function switchForms(newForm: HTMLFormElement) {
    // fetch the old height for animation purposes
    const oldHeight = formsContainer.offsetHeight;
    
    // animate the current form off to the left
    currentForm.classList.toggle("center", false);
    currentForm.classList.toggle("left", true);
    currentForm.classList.toggle("hidden", true);

    // bring in the new form
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

        const initiateResponse = await client.send(initiateCommand) as InitiateAuthResponse;
        console.log(initiateResponse);
    } catch {

    }
}