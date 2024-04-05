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
                    enum: [ "minimal", "full" ],
                    title: "Device Trust Level",
                    description: "How much this device should be trusted. This affects how user secrets are stored.",
                    default: "minimal"
                }
            },
            required: [ "deviceTrust" ]
        },
        "global": {
            type: "object",
            properties: {

            }
        }
    }
} as const satisfies JSONSchema;
export type SecuritySettings = FromSchema<typeof securitySettingsSchema>;
export type SettingsGroup = SecuritySettings

export const userSettingsSchema = {
    type: "object",
    properties: {
        "securitySettings": { ...securitySettingsSchema },
    },
    required: [ "securitySettings" ]
} as const satisfies JSONSchema;
export const userSettingsValidator = ajv.compile(userSettingsSchema);
export type UserSettings = FromSchema<typeof userSettingsSchema>;