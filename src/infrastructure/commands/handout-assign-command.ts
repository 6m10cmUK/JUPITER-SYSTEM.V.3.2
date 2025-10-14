import { 
    ChatInputCommandInteraction, 
    SlashCommandBuilder, 
    SlashCommandUserOption,
    SlashCommandIntegerOption,
    SlashCommandStringOption
} from 'discord.js';
import { Command } from '../../interfaces/Command';
import { HandoutAssignHandler } from './handlers/HandoutAssignHandler';

/**
 * ハンドアウト割り当てコマンド
 * 指定されたユーザーにハンドアウトチャンネルへのアクセス権を付与し、専用チャンネルを作成
 */

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('handout-assign')
        .setDescription('ハンドアウトをユーザーに割り当て')
        .addUserOption((option: SlashCommandUserOption) =>
            option.setName('user')
                .setDescription('割り当て対象のユーザー')
                .setRequired(true)
        )
        .addIntegerOption((option: SlashCommandIntegerOption) =>
            option.setName('handout')
                .setDescription('ハンドアウト番号 (1-10)')
                .setMinValue(1)
                .setMaxValue(10)
                .setRequired(true)
        )
        .addStringOption((option: SlashCommandStringOption) =>
            option.setName('display_name')
                .setDescription('専用チャンネルの表示名（省略時はユーザー名）')
                .setMaxLength(32)
                .setRequired(false)
        ) as SlashCommandBuilder,

    async execute(interaction: ChatInputCommandInteraction) {
        // HandoutAssignHandlerに処理を委譲（統一パターン）
        const handler = new HandoutAssignHandler();
        await handler.handle(interaction);
    }
};