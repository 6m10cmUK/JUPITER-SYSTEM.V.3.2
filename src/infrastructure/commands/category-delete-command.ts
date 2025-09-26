import { 
    ChatInputCommandInteraction, 
    SlashCommandBuilder, 
    SlashCommandStringOption
} from 'discord.js';
import { Command } from '../../interfaces/Command';
import { CategoryCommandHandler } from './handlers/CategoryCommandHandler';

/**
 * カテゴリー削除コマンド
 * 指定されたDiscordカテゴリーを削除
 */

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('category-delete')
        .setDescription('カテゴリ削除')
        .addStringOption((option: SlashCommandStringOption) =>
            option.setName('category-id')
                .setDescription('削除するカテゴリのID')
                .setRequired(true)
        ) as SlashCommandBuilder,

    async execute(interaction: ChatInputCommandInteraction) {
        // CategoryCommandHandlerに処理を委譲（統一パターン）
        const handler = new CategoryCommandHandler();
        await handler.handle(interaction, 'delete');
    }
};