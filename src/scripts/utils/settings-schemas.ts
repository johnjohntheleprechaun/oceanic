import Ajv from "ajv";
import { FromSchema, JSONSchema } from "json-schema-to-ts";

const ajv = new Ajv();

// All settings schemas should have local and global. Global settings are per-account, local are device-specific
const settingsGroupTemplate = {
    type: "object",
    properties: {
        "local": {
            type: "object"
        },
        "global": {
            type: "object"
        }
    },
    required: [ "global" ]
} as const satisfies JSONSchema;

const securitySettingsSchema = {
    type: "object",
    title: "Security Settings",
    properties: {
        "local": {
            type: "object",
            properties: {
                "deviceTrust": {
                    enum: [ "none", "minimal", "full" ],
                    title: "Device Trust Level",
                    description:
`How much this device should be trusted. This affects how user secrets are stored. More specifically: 
| Trust Level | Effect |
| ----------- | ------ |
| \`none\` | Tokens and the unwrapped master key pair are stored in session storage, and will be destroyed when you close the page. Journals and notes won't be stored on-device. |
| \`minimal\` | Tokens and the *wrapped* master key pair are stored in IndexedDB, while the *unwrapped* master key pair is stored in session storage. Journals and notes that are stored locally will be encrypted. Someone with access to this device will have access to your account, but won't be able to decrypt your journals or notes without entering your master password |
| \`full\` | Tokens and the unwrapped master key pair are stored in IndexedDB. Journals and notes that are stored locally will be encrypted only to reduce code complexity/redundancy, and can be decrypted without needing to enter your master password. Only do this on a device that only you can access. |`,
                    default: "minimal"
                }
            }
        },
        "global": {
            type: "object",
            properties: {

            }
        }
    }
} as const satisfies JSONSchema;
export type SecuritySettings = FromSchema<typeof securitySettingsSchema>;

const generalSettingsSchema = {
    type: "object",
    properties: {
        "onlineMode": {
            title: "Online Mode",
            description: "Affects whether cloud features are used",
            oneOf: [
                {
                    const: "online",
                    description: "When this device is online, all online features will be enabled (unless they've specifically been disabled)."
                },
                {
                    const: "offline",
                    description: "All cloud features will be disabled, regardless of whether this device is online."
                }
            ],
            default: "offline"
        }
    }
} as const satisfies JSONSchema;


export type SettingsGroup = SecuritySettings

export const userSettingsSchema = {
    type: "object",
    properties: {
        "securitySettings": { ...securitySettingsSchema },
        "generalSettings": { ...generalSettingsSchema }
    }
} as const satisfies JSONSchema;
export const userSettingsValidator = ajv.compile(userSettingsSchema);
export type UserSettings = FromSchema<typeof userSettingsSchema>;