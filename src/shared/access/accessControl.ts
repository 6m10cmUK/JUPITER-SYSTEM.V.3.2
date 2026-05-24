import { banList } from '../../config/banList';

export function isUserBanned(userId: string): boolean {
    return banList.users.includes(userId);
}

export function isGuildBanned(guildId: string): boolean {
    return banList.guilds.includes(guildId);
}

export function isBanned(userId?: string, guildId?: string): boolean {
    if (userId && isUserBanned(userId)) {
        return true;
    }
    if (guildId && isGuildBanned(guildId)) {
        return true;
    }
    return false;
}
