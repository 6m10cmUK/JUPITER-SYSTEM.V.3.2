import { Client, Message } from 'discord.js';
import { MessageUseCase } from '../../usecases/MessageUseCase';

export class DiscordAdapter {
    private prefix = '/#';

    constructor(private client: Client) {}

    async handleMessage(message: Message, useCase: MessageUseCase) {
        if (!message.content.startsWith(this.prefix)) return;

        const commandBody = message.content.slice(this.prefix.length).trim();
        const args = commandBody.split(/\s+/);
        const command = args.shift()?.toLowerCase();

        if (command === 'setup') {
            const guildId = message.guild?.id;
            if (!guildId) return;
            await useCase.executeSetup(message, guildId);
        }
    }
} 