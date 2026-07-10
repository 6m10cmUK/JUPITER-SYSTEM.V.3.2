import * as fs from 'fs';
import * as path from 'path';

export interface MeigenEntry {
    id: number;
    content: string;
    authorId: string | null;
    /** Display name used as fallback when authorId cannot be resolved. */
    authorName: string | null;
    registeredBy: string;
    registeredAt: string;
}

interface MeigenData {
    nextId: number;
    entries: MeigenEntry[];
}

export class MeigenService {
    private isFileNotFoundError(error: unknown): error is NodeJS.ErrnoException {
        return error instanceof Error
            && 'code' in error
            && (error as { code?: unknown }).code === 'ENOENT';
    }

    private isMeigenData(value: unknown): value is MeigenData {
        if (typeof value !== 'object' || value === null) {
            return false;
        }

        const data = value as { nextId?: unknown; entries?: unknown };
        return typeof data.nextId === 'number' && Array.isArray(data.entries);
    }

    private getFilePath(guildId: string): string {
        return path.join(process.cwd(), 'guilds', guildId, 'quotes.json');
    }

    private load(guildId: string): MeigenData {
        const filePath = this.getFilePath(guildId);

        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const parsed: unknown = JSON.parse(content);

            if (!this.isMeigenData(parsed)) {
                throw new Error(`Invalid meigen data format: ${filePath}`);
            }

            return parsed;
        } catch (error: unknown) {
            if (!this.isFileNotFoundError(error)) {
                throw error;
            }

            return {
                nextId: 1,
                entries: [],
            };
        }
    }

    private save(guildId: string, data: MeigenData): void {
        const filePath = this.getFilePath(guildId);
        const dirPath = path.dirname(filePath);
        const tempFilePath = `${filePath}.tmp`;

        fs.mkdirSync(dirPath, { recursive: true });
        fs.writeFileSync(tempFilePath, JSON.stringify(data, null, 2), 'utf-8');
        fs.renameSync(tempFilePath, filePath);
    }

    public add(
        guildId: string,
        content: string,
        registeredBy: string,
        authorId?: string,
        authorName?: string
    ): MeigenEntry {
        const data = this.load(guildId);

        const entry: MeigenEntry = {
            id: data.nextId,
            content,
            authorId: authorId ?? null,
            authorName: authorName ?? null,
            registeredBy,
            registeredAt: new Date().toISOString(),
        };

        data.nextId += 1;
        data.entries.push(entry);

        this.save(guildId, data);

        return entry;
    }

    public getRandom(guildId: string): MeigenEntry | null {
        const data = this.load(guildId);

        if (data.entries.length === 0) {
            return null;
        }

        const randomIndex = Math.floor(Math.random() * data.entries.length);
        return data.entries[randomIndex];
    }

    public getAll(guildId: string): MeigenEntry[] {
        const data = this.load(guildId);
        return data.entries;
    }

    public delete(guildId: string, id: number): boolean {
        const data = this.load(guildId);
        const initialLength = data.entries.length;

        data.entries = data.entries.filter((entry: MeigenEntry) => entry.id !== id);

        if (data.entries.length === initialLength) {
            return false;
        }

        this.save(guildId, data);
        return true;
    }
}
