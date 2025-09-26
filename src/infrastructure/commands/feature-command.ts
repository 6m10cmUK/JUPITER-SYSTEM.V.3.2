import { 
    ChatInputCommandInteraction, 
    SlashCommandBuilder, 
    SlashCommandIntegerOption,
} from 'discord.js';
import { Command } from '../../interfaces/Command';
import { FeatureCommandHandler } from './handlers/FeatureCommandHandler';

/**
 * CoC TRPG用のランダム特徴表コマンド
 * 1-3個の特徴をランダムに生成する機能を提供
 */

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('feature')
        .setDescription('CoC TRPG用のランダム特徴表コマンド')
        .addIntegerOption((option: SlashCommandIntegerOption) =>
            option.setName('count')
                .setDescription('取得する特徴の数')
                .setMinValue(1)
                .setMaxValue(3)
                .setRequired(false)
        ) as SlashCommandBuilder,

    async execute(interaction: ChatInputCommandInteraction) {
        // FeatureCommandHandlerに処理を委譲（統一パターン）
        const handler = new FeatureCommandHandler();
        await handler.handle(interaction);
    }
};
