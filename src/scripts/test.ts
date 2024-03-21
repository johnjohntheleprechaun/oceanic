import { CognitoIdentityProviderClient, UpdateUserAttributesCommand } from "@aws-sdk/client-cognito-identity-provider";

declare const cloudConfig: any;

async function test() {
    const setAttrCommand = new UpdateUserAttributesCommand({
        UserAttributes: [{
            Name: "identityId",
            Value: "fuck you smelly nerd"
        }],
        AccessToken: window.localStorage.getItem("access_token")
    });
    const client = new CognitoIdentityProviderClient({ region: "us-west-2" });
    const resp = await client.send(setAttrCommand);
    console.log(resp);
}

export {test}