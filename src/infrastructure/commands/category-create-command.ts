import { 
    ChatInputCommandInteraction, 
    SlashCommandBuilder, 
    SlashCommandStringOption,
    SlashCommandIntegerOption
} from 'discord.js';
import { Command } from '../../interfaces/Command';
import { CategoryCommandHandler } from './handlers/CategoryCommandHandler';

/**
 * カテゴリー作成コマンド
 * Discordサーバーにカテゴリーと秘匿チャンネルを作成
 */

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('category-create')
        .setDescription('カテゴリ作成')
        .addStringOption((option: SlashCommandStringOption) =>
            option.setName('name')
                .setDescription('カテゴリ名')
                .setRequired(true)
        )
        .addIntegerOption((option: SlashCommandIntegerOption) =>
            option.setName('hand-out')
                .setDescription('秘匿チャンネルの数')
                .setMinValue(0)
                .setMaxValue(10)
                .setRequired(false)
        ) as SlashCommandBuilder,

    async execute(interaction: ChatInputCommandInteraction) {
        // CategoryCommandHandlerに処理を委譲（統一パターン）
        const handler = new CategoryCommandHandler();
        await handler.handle(interaction, 'create');
    }
};