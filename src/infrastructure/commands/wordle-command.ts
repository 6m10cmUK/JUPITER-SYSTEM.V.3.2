import { Command } from '../../interfaces/Command';
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { WordleCommandHandler } from './handlers/WordleCommandHandler';

/**
 * 日本語Wordleゲームコマンド
 * 4文字のひらがな単語を当てるゲーム機能を提供
 */

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('wordle')
        .setDescription('日本語版Wordleを遊ぶ（4文字）'),

    async execute(interaction: ChatInputCommandInteraction) {
        // WordleCommandHandlerに処理を委譲（統一パターン）
        const handler = new WordleCommandHandler();
        await handler.handle(interaction);
    }
};