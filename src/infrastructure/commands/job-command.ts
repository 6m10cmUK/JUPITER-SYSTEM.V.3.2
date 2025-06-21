import { 
    ChatInputCommandInteraction, 
    SlashCommandBuilder, 
    SlashCommandStringOption, 
    SlashCommandSubcommandBuilder, 
    SlashCommandIntegerOption 
} from 'discord.js';
import { Command } from '../../interfaces/Command';
import { JobEmbedFormatter } from '../../presentation/formatters/JobEmbedFormatter';
import { JobSearchCriteria } from '../../application/dto/JobDto';

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
        const subcommand = interaction.options.getSubcommand() as JobSearchCriteria['subcommand'];
        await interaction.deferReply();

        const query = interaction.options.getString('query') ?? '';
        const formatter = new JobEmbedFormatter();

        if (subcommand === 'random') {
            const count = interaction.options.getInteger('count') ?? 1;
            const criteria: JobSearchCriteria = {
                query,
                subcommand,
                page: count // randomの場合、pageがcountとして使われる
            };
            const display = await formatter.format(interaction, criteria);
            await interaction.editReply(display);
            return;
        }

        const criteria: JobSearchCriteria = {
            query,
            subcommand,
            page: 1
        };
        const display = await formatter.format(interaction, criteria);
        await interaction.editReply(display);
    }
};