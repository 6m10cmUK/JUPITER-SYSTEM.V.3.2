import { Command } from '../../../interfaces/Command';
import { promises as fs } from 'fs';
import * as path from 'path';

export class CommandLoader {
    private commands: Map<string, Command> = new Map();
    private adminCommands: Map<string, (message: any, guildId: string) => Promise<void>> = new Map();

    async loadCommands(): Promise<void> {
        const commandsPath = path.join(process.cwd(), 'src/infrastructure/commands');
        
        try {
            const entries = await fs.readdir(commandsPath, { withFileTypes: true });
            const commandFiles = entries
                .filter(entry => entry.isFile() && entry.name.endsWith('-command.ts'))
                .map(entry => entry.name);

            for (const file of commandFiles) {
                try {
                    const commandModule = await import(path.join(commandsPath, file));
                    const commandInstance = new commandModule.default();
                    this.commands.set(commandInstance.data.name, commandInstance);
                } catch (error) {
                    console.error(`Failed to load command ${file}:`, error);
                }
            }
        } catch (error) {
            console.error(`Failed to read commands directory: ${commandsPath}`, error);
        }
    }

    async loadAdminCommands(): Promise<void> {
        const { execute } = await import('../../../adminCommands/setup');
        this.adminCommands.set('setup', execute);
    }

    getCommand(name: string): Command | undefined {
        return this.commands.get(name);
    }

    getAdminCommand(name: string): ((message: any, guildId: string) => Promise<void>) | undefined {
        return this.adminCommands.get(name);
    }

    getAllCommands(): Map<string, Command> {
        return this.commands;
    }

    getAllAdminCommands(): Map<string, (message: any, guildId: string) => Promise<void>> {
        return this.adminCommands;
    }
}