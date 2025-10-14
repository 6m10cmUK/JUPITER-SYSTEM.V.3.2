import { 
    ChatInputCommandInteraction, 
    SlashCommandBuilder, 
    SlashCommandStringOption,
    SlashCommandIntegerOption
} from 'discord.js';
import { Command } from '../../interfaces/Command';
import { CategoryCommandHandler } from './handlers/CategoryCommandHandler';

/**
 * カテゴリー作成コマンド（v3.2拡張版）
 * CoCシナリオ用カテゴリ・ロール・基本チャンネル・ハンドアウトチャンネルを一括作成
 * - {カテゴリ名}_1, {カテゴリ名}_通過者 ロール作成
 * - 概要、日程、第1陣、通過者 チャンネル作成
 * - ho-1〜ho-{n} ハンドアウトチャンネル作成（オプション）
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
            option.setName('handout')
                .setDescription('ハンドアウトチャンネルの数 (0-10)')
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