import { ChatInputCommandInteraction, SlashCommandBuilder, SlashCommandStringOption, SlashCommandSubcommandBuilder } from 'discord.js';
import { Command } from '../interfaces/Command';
import * as fs from 'fs';
import * as path from 'path';

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
        ) as SlashCommandBuilder,

    async execute(interaction: ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand();
        await interaction.deferReply();

        const query = interaction.options.getString('query', true);

        const embed = createJobEmbed(subcommand, query);

        await interaction.editReply({ embeds: [embed] });
    }
};

export function createJobEmbed(subcommand: string, query: string) {
    if(subcommand == 'all'){
        return;
    }
    try {
        const dataPath = path.join(process.cwd(), 'src', 'data', 'jobs.json');
        const jobData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

        const response = jobData.filter((job: any) => job[subcommand].includes(query));

        console.log(response);

    } catch (error) {
        console.error('検索中にエラーが発生したよ:', error);
        return null;
    }
}