import { UserSettings, userSettingsSchema, userSettingsValidator } from "./settings-schemas";
import { Database, userDatabaseUpgrade, userDatabaseVersion } from "./storage";
const defaults = require("json-schema-defaults");

export class SettingsManager {
    private static database: Database;

    public static async ensureLoaded() {
        if (!this.database) {
            this.database = await Database.open("user", userDatabaseVersion, userDatabaseUpgrade);
        }
    }

    public static async getSettings(): Promise<UserSettings> {
        await this.ensureLoaded();
        const settings = await this.database.getObject("settings", "data");
        if (!userSettingsValidator(settings)) {
            // ditch the invalid settings, and set defaults
            // something better should probably be made at some point
            const defaultSettings = defaults(userSettingsSchema);
            await this.overwriteSettings(defaultSettings);
            return defaultSettings as UserSettings;
        } else {
            return settings as UserSettings;
        }
    }

    private static async overwriteSettings(newSettings: UserSettings) {
        await this.database.putObject(newSettings, "data", "settings");
    }

    public static async updateSetting(settingPath: string, value: string | boolean | number) {
        const settingsCopy = await this.getSettings();
        const keys = settingPath.split(".");
        
        let currentObject: any = settingsCopy;
        for (const key of keys.slice(0, -1)) {
            if (!currentObject[key]) {
                currentObject[key] = {};
            }
            currentObject = currentObject[key];
        }

        currentObject[ keys[keys.length - 1] ] = value;

        if (userSettingsValidator(settingsCopy)) {
            await this.overwriteSettings(settingsCopy);
        } else {
            throw new InvalidSettingValue(settingPath, value);
        }
    }
}

export class InvalidSettingValue extends Error {
    constructor (path: string, value: any) {
        super(`${value} is an invalid value for ${path}`);
        this.name = "NoSuchSettingError";
    }
}

export class NoSuchSettingError extends Error {
    constructor (settingName: string) {
        super(`Setting "${settingName}" doesn't exist`);
        this.name = "NoSuchSettingError";
    }
}
export class IncompleteSettingPathError extends Error {
    constructor (settingPath: string) {
        super(`Setting path "${settingPath}" is incomplete`);
        this.name = "IncompleteSettingPathError";
    }
}