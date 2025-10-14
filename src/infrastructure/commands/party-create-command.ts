import { 
    ChatInputCommandInteraction, 
    SlashCommandBuilder, 
    SlashCommandIntegerOption
} from 'discord.js';
import { Command } from '../../interfaces/Command';
import { PartyCreateHandler } from './handlers/PartyCreateHandler';

/**
 * 陣営作成コマンド
 * 指定された番号の陣営（第n陣）を作成し、専用ロールとチャンネルを設定
 */

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('party-create')
        .setDescription('新しい陣営（第n陣）を作成')
        .addIntegerOption((option: SlashCommandIntegerOption) =>
            option.setName('party_number')
                .setDescription('陣営番号 (1-100)')
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true)
        ) as SlashCommandBuilder,

    async execute(interaction: ChatInputCommandInteraction) {
        // PartyCreateHandlerに処理を委譲（統一パターン）
        const handler = new PartyCreateHandler();
        await handler.handle(interaction);
    }
};