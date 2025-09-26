import { 
    ChatInputCommandInteraction, 
    SlashCommandBuilder, 
    SlashCommandIntegerOption,
    SlashCommandStringOption,
} from 'discord.js';
import { Command } from '../../interfaces/Command';
import { NameCommandHandler } from './handlers/NameCommandHandler';

/**
 * ランダム名前生成コマンド
 * 男性・女性、地域別の名前をランダム生成
 */

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('name')
        .setDescription('ランダム名前')
        .addStringOption((option: SlashCommandStringOption) =>
            option.setName('type')
                .setDescription('表示する名前の種類')
                .setRequired(true)
                .addChoices(
                    { name: '男性名', value: 'male' },
                    { name: '女性名', value: 'female' }
                )
        )
        .addStringOption((option: SlashCommandStringOption) =>
            option.setName('region')
                .setDescription('名前の地域')
                .setRequired(false)
                .addChoices(
                    { name: 'JPN', value: 'jp' },
                    { name: 'ENG', value: 'en' }
                )
        )
        .addIntegerOption((option: SlashCommandIntegerOption) =>
            option.setName('count')
                .setDescription('取得する名前の数')
                .setMinValue(1)
                .setMaxValue(10)
                .setRequired(false)
        ) as SlashCommandBuilder,

    async execute(interaction: ChatInputCommandInteraction) {
        // NameCommandHandlerに処理を委譲（統一パターン）
        const handler = new NameCommandHandler();
        await handler.handle(interaction);
    }
};
