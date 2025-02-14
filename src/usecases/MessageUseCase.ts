import { Message } from 'discord.js';
import { execute } from '../adminCommands/setup.js';
import { execute as executeUpdate } from '../adminCommands/update.js';
import { execute as executeAdd } from '../adminCommands/add.js';

export class MessageUseCase {
    async executeSetup(message: Message, guildId: string) {
        await execute(message, guildId);
    }

    async executeUpdate(message: Message, guildId: string) {
        await executeUpdate(message, guildId);
    }

    async executeAdd(message: Message, guildId: string) {
        await executeAdd(message, guildId);
    }
} 
