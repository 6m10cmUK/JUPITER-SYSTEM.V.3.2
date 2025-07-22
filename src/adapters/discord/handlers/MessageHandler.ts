import { Message } from 'discord.js';
import { CommandLoader } from '../loaders/CommandLoader';
import { diceRoll } from '../../../infrastructure/commands/legacy/classicDiceRoll';
import { createErrorMessage } from '../../../presentation/discord/builders/messages';

export class MessageHandler {
    private prefix = '/#';

    constructor(private commandLoader: CommandLoader) {}

    async handleMessage(message: Message): Promise<void> {
        if (message.author.bot) return;

        const content = message.content.trim();

        // 管理者コマンドの処理
        if (content.startsWith(this.prefix)) {
            await this.handleAdminCommand(message, content);
            return;
        }

        // 通常のダイスロールコマンドの処理
        if (this.isDiceRollCommand(content)) {
            await this.handleDiceRoll(message, content);
        }
    }

    private async handleAdminCommand(message: Message, content: string): Promise<void> {
        const args = content.slice(this.prefix.length).trim().split(/\s+/);
        const commandName = args[0];

        if (!message.guild) {
            await message.reply('このコマンドはサーバー内でのみ使用できます。');
            return;
        }

        const adminCommand = this.commandLoader.getAdminCommand(commandName);
        if (adminCommand) {
            try {
                await adminCommand(message, message.guild.id);
            } catch (error) {
                console.error(`Error executing admin command ${commandName}:`, error);
                await message.reply('コマンドの実行中にエラーが発生しました。');
            }
        }
    }

    private async handleDiceRoll(message: Message, content: string): Promise<void> {
        try {
            await diceRoll(message);
        } catch (error) {
            console.error('Dice roll error:', error);
            const errorMsg = createErrorMessage(
                message,
                'Dice Roll Error',
                error instanceof Error ? error.message : 'Unknown error'
            );
            await message.reply(errorMsg);
        }
    }

    private isDiceRollCommand(content: string): boolean {
        const dicePatterns = [
            /\d+d\d+/i,
            /choice/i,
            /^cc[b]?/i,
            /^res[b]?/i,
            /^cbr[b]?/i,
            /^far/i,
            /^d66/i,
            /^\d+b\d+/i,
            /^\d+u\d+/i,
            /^c\(/i
        ];

        return dicePatterns.some(pattern => pattern.test(content));
    }
}