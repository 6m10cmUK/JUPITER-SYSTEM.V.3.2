import { Message } from 'discord.js';
import { execute } from '../adminCommands/setup.js';

export class MessageUseCase {
    async executeSetup(message: Message, guildId: string) {
        await execute(message, guildId);
    }
} 