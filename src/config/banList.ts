export interface BanList {
    users: string[];   // Discord User ID（snowflake）
    guilds: string[];  // Discord Guild ID（snowflake）
}

export const banList: BanList = {
    users: [],
    guilds: [],
};
