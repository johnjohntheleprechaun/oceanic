import { FromSchema, JSONSchema } from "json-schema-to-ts";

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
    properties: {
        "local": {
            type: "object",
            properties: {
                "deviceTrustLevel": {
                    enum: [ "none", "minimal", "secure" ],
                    title: "Device Trust Level",
                    description: "How much this device should be trusted. This affects where the unwrapped master key is stored, or if it's stored at all.",
                    default: "none"
                }
            },
            required: [ "deviceTrustLevel" ]
        },
        "global": {
            type: "object",
            properties: {

            }
        }
    },
    required: [ "global" ]
} as const satisfies JSONSchema;
// type SecuritySettings = FromSchema<typeof securitySettingsSchema>;

const userSettingsSchema = {
    type: "object",
    properties: {
        "user": { type: "string", description: "The user's identity id"},
        "securitySettings": {
            title: "Security Settings",
            oneOf: [ securitySettingsSchema ]
        }
    },
    required: [ "securitySettings" ]
} as const satisfies JSONSchema;
type UserSettings = FromSchema<typeof userSettingsSchema>;