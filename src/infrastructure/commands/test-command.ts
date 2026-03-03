import { 
    ChatInputCommandInteraction, 
    SlashCommandBuilder
} from 'discord.js';
import { Command } from '../../shared/interfaces/Command';
import { SimpleCommandHandler } from './handlers/SimpleCommandHandler';

/**
 * システムテストコマンド（hoge）
 * ボイスチャンネル削除機能（「秘匿」「セッション中」対象）
 */

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('hoge')
        .setDescription('テスト機能 - 秘匿・セッション中ボイスチャンネル削除') as SlashCommandBuilder,
        
    async execute(interaction: ChatInputCommandInteraction) {
        // SimpleCommandHandlerに処理を委譲（統一パターン）
        const handler = new SimpleCommandHandler();
        await handler.handleTest(interaction);
    }
};