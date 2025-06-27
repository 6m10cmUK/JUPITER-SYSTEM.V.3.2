import { InteractionHandler } from '../../../interfaces/InteractionHandler';
import { promises as fs } from 'fs';
import * as path from 'path';

export class InteractionLoader {
    private interactionHandlers: Map<string, InteractionHandler> = new Map();

    async loadInteractionHandlers(): Promise<void> {
        const interactionsPath = path.join(process.cwd(), 'dist/interactions');
        
        try {
            await fs.access(interactionsPath);
        } catch {
            console.warn(`Interactions directory not found: ${interactionsPath}`);
            return;
        }

        try {
            const files = (await fs.readdir(interactionsPath)).filter(file => file.endsWith('.js'));

            for (const file of files) {
                try {
                    const filePath = path.join(interactionsPath, file);
                    const handler = await import(filePath);
                    if (handler.prefix && handler.execute) {
                        this.interactionHandlers.set(handler.prefix, handler);
                    } else {
                        console.warn(`Invalid interaction handler definition in ${file}`);
                    }
                } catch (error) {
                    console.error(`Error loading ${file}:`, error);
                }
            }
        } catch (error) {
            console.error(`Failed to read interactions directory: ${interactionsPath}`, error);
        }
    }

    getHandler(prefix: string): InteractionHandler | undefined {
        return this.interactionHandlers.get(prefix);
    }

    getAllHandlers(): Map<string, InteractionHandler> {
        return this.interactionHandlers;
    }
}