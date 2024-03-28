import { FromSchema, JSONSchema } from "json-schema-to-ts";

const securitySettingsSchema = {
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
} as const satisfies JSONSchema;
type SecuritySettings = FromSchema<typeof securitySettingsSchema>;

const userSettingsSchema = {
    type: "object",
    properties: {
        "user": { type: "string", description: "The user's identity id"},
        "securitySettings": {
            title: "Security Settings",
            oneOf: [ securitySettingsSchema ]
        }
    },
    required: [ "user", "securitySettings" ]
} as const satisfies JSONSchema;
type UserSettings = FromSchema<typeof userSettingsSchema>;