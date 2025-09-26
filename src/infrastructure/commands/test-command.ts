import { 
    ChatInputCommandInteraction, 
    SlashCommandBuilder,
    SlashCommandRoleOption,
    SlashCommandUserOption,
} from 'discord.js';
import { Command } from '../../interfaces/Command';
import { SimpleCommandHandler } from './handlers/SimpleCommandHandler';

/**
 * システムテストコマンド（hoge）
 * ユーザーにロール追加のテスト機能
 */

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('hoge')
        .setDescription('システムテスト - ユーザーにロール追加')
        .addUserOption((option: SlashCommandUserOption) =>
            option.setName('user')
                .setDescription('ユーザー')
                .setRequired(true)
        )
        .addRoleOption((option: SlashCommandRoleOption) =>
            option.setName('role')
                .setDescription('ロール')
                .setRequired(true)
        ) as SlashCommandBuilder,
        
    async execute(interaction: ChatInputCommandInteraction) {
        // SimpleCommandHandlerに処理を委譲（統一パターン）
        const handler = new SimpleCommandHandler();
        await handler.handleTest(interaction);
    }
};