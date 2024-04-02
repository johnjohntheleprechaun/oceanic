import { UserSettings, userSettingsValidator } from "./settings-schemas";

export class SettingsManager {
    private static settings: UserSettings;

    public static async ensureLoaded() {
        if (this.settings) {
            // assume it's loaded properly
            // Better logic should be added later, perhaps
            return;
        } else {
            // Load settings
        }
    }

    public static async getSettings() {
        await this.ensureLoaded();
        return this.settings;
    }

    public static updateSetting(settingPath: string, value: string | boolean | number) {
        const settingsCopy = structuredClone(this.settings);
        const keys = settingPath.split(".");
        
        let currentObject: any = settingsCopy;
        for (const key of keys) {
            if (!currentObject[key]) {
                currentObject[key] = {};
            }
            currentObject = currentObject[key];
        }

        currentObject[ keys[keys.length - 1] ] = value;

        if (userSettingsValidator(currentObject)) {
            this.settings = settingsCopy;
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