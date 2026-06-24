import * as fs from 'fs';
import * as path from 'path';

export interface BanRecord {
    /** BANを実行した運営者のユーザーID */
    bannedBy: string;
    /** 理由（任意） */
    reason?: string;
    /** ISO 8601 形式のBAN日時 */
    bannedAt: string;
}

interface BanData {
    /** グローバルBANされたユーザー（どのサーバーでもbotを使えない） */
    users: Record<string, BanRecord>;
    /** BANされたサーバー（そのサーバー内では誰もbotを使えない） */
    servers: Record<string, BanRecord>;
}

/**
 * ユーザー / サーバー単位の全機能ブロック（BAN）を管理する。
 * data/bans.json に永続化し、アプリ再起動後も状態を保持する。
 */
export class BanService {
    private readonly dataFile: string;
    private data: BanData = { users: {}, servers: {} };

    constructor() {
        this.dataFile = path.join(process.cwd(), 'data', 'bans.json');

        const dataDir = path.dirname(this.dataFile);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        this.load();
    }

    private load(): void {
        if (!fs.existsSync(this.dataFile)) {
            return;
        }
        try {
            const parsed = JSON.parse(fs.readFileSync(this.dataFile, 'utf8'));
            this.data = {
                users: parsed.users ?? {},
                servers: parsed.servers ?? {},
            };
            const userCount = Object.keys(this.data.users).length;
            const serverCount = Object.keys(this.data.servers).length;
            console.log(`[Ban] BAN情報を読み込みました (users: ${userCount}, servers: ${serverCount})`);
        } catch (error) {
            console.error('[Ban] BAN情報の読み込みに失敗:', error);
        }
    }

    private save(): void {
        fs.writeFileSync(this.dataFile, JSON.stringify(this.data, null, 2));
    }

    isUserBanned(userId: string): boolean {
        return userId in this.data.users;
    }

    isServerBanned(guildId: string | null | undefined): boolean {
        if (!guildId) return false;
        return guildId in this.data.servers;
    }

    /** ユーザーがグローバルBAN、またはサーバーがBANされていればtrue */
    isBlocked(userId: string, guildId: string | null | undefined): boolean {
        return this.isUserBanned(userId) || this.isServerBanned(guildId);
    }

    /** 既にBAN済みならfalse、新規にBANしたらtrueを返す */
    banUser(userId: string, bannedBy: string, reason?: string): boolean {
        if (this.isUserBanned(userId)) return false;
        this.data.users[userId] = { bannedBy, reason, bannedAt: new Date().toISOString() };
        this.save();
        return true;
    }

    banServer(guildId: string, bannedBy: string, reason?: string): boolean {
        if (this.isServerBanned(guildId)) return false;
        this.data.servers[guildId] = { bannedBy, reason, bannedAt: new Date().toISOString() };
        this.save();
        return true;
    }

    /** BANされていなければfalse、解除したらtrueを返す */
    unbanUser(userId: string): boolean {
        if (!this.isUserBanned(userId)) return false;
        delete this.data.users[userId];
        this.save();
        return true;
    }

    unbanServer(guildId: string): boolean {
        if (!this.isServerBanned(guildId)) return false;
        delete this.data.servers[guildId];
        this.save();
        return true;
    }

    listUsers(): Array<{ id: string } & BanRecord> {
        return Object.entries(this.data.users).map(([id, record]) => ({ id, ...record }));
    }

    listServers(): Array<{ id: string } & BanRecord> {
        return Object.entries(this.data.servers).map(([id, record]) => ({ id, ...record }));
    }
}

/** アプリ全体で共有するシングルトン */
export const banService = new BanService();
