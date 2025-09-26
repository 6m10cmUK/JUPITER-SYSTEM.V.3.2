import { 
    ChatInputCommandInteraction, 
    SlashCommandBuilder, 
    SlashCommandStringOption, 
    SlashCommandSubcommandBuilder, 
    SlashCommandIntegerOption 
} from 'discord.js';
import { Command } from '../../interfaces/Command';
import { JobCommandHandler } from './handlers/JobCommandHandler';

/**
 * CoC TRPG用の職業検索・生成コマンド
 * 名前・技能・ポイント検索、一覧表示、ランダム生成機能を提供
 */

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('job')
        .setDescription('職業検索')
        .addSubcommand((subcommand: SlashCommandSubcommandBuilder) =>
            subcommand.setName('name')
                .setDescription('職業名で検索')
                .addStringOption((option: SlashCommandStringOption) =>
                    option.setName('query')
                        .setDescription('検索したい職業名')
                        .setRequired(true)
                )
        )
        .addSubcommand((subcommand: SlashCommandSubcommandBuilder) =>
            subcommand.setName('skill')
                .setDescription('職業技能で検索')
                .addStringOption((option: SlashCommandStringOption) =>
                    option.setName('query')
                        .setDescription('検索したい技能名')
                        .setRequired(true)
                )
        )
        .addSubcommand((subcommand: SlashCommandSubcommandBuilder) =>
            subcommand.setName('point')
                .setDescription('職業ポイントで検索')
                .addStringOption((option: SlashCommandStringOption) =>
                    option.setName('query')
                        .setDescription('検索したい職業ポイント名')
                        .setRequired(true)
                )
        )
        .addSubcommand((subcommand: SlashCommandSubcommandBuilder) =>
            subcommand.setName('all')
                .setDescription('職業一覧')
        )
        .addSubcommand((subcommand: SlashCommandSubcommandBuilder) =>
            subcommand.setName('random')
                .setDescription('ランダムで職業を表示')
                .addIntegerOption((option: SlashCommandIntegerOption) =>
                    option.setName('count')
                        .setDescription('表示する職業の数')
                        .setMinValue(1)
                        .setMaxValue(8)
                        .setRequired(false)
                )
        ) as SlashCommandBuilder,

    async execute(interaction: ChatInputCommandInteraction) {
        // JobCommandHandlerに処理を委譲（statusコマンドと同様のパターン）
        const handler = new JobCommandHandler();
        await handler.handle(interaction);
    }
};