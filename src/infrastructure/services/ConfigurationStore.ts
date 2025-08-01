class ConfigurationStore {
    private static instance: ConfigurationStore;
    private configurations: Map<string, Map<string, number[]>>;

    private constructor() {
        this.configurations = new Map();
    }

    public static getInstance(): ConfigurationStore {
        if (!ConfigurationStore.instance) {
            ConfigurationStore.instance = new ConfigurationStore();
        }
        return ConfigurationStore.instance;
    }

    public setUserConfiguration(userId: string, key: string, values: number[]): void {
        if (!this.configurations.has(userId)) {
            this.configurations.set(userId, new Map());
        }
        this.configurations.get(userId)!.set(key, values);
    }

    public getUserConfiguration(userId: string, key: string): number[] | undefined {
        return this.configurations.get(userId)?.get(key);
    }

    public clearUserConfiguration(userId: string, key: string): void {
        this.configurations.get(userId)?.delete(key);
    }

    public clearAllUserConfigurations(userId: string): void {
        this.configurations.delete(userId);
    }
}

export const configurationStore = ConfigurationStore.getInstance();