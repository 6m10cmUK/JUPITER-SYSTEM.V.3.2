import { EmbedBuilder, Interaction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { JobData, JobSearchCriteria, JobDisplayData } from '../../application/dto/JobDto';
import { JobService } from '../../domain/services/JobService';
import { generateEmbed } from '../discord/builders/embedGenerator';

export class JobEmbedFormatter {
    private jobService: JobService;

    constructor() {
        this.jobService = new JobService();
    }

    async format(interaction: Interaction, criteria: JobSearchCriteria): Promise<{
        embeds: EmbedBuilder[];
        components: ActionRowBuilder<ButtonBuilder>[];
    }> {
        // randomの場合、pageがcountとして使われているので調整
        if (criteria.subcommand === 'random') {
            criteria.count = criteria.page;
            criteria.page = 1;
        }

        const allJobs = this.jobService.searchJobs(criteria);
        const title = this.jobService.getTitle(criteria);
        
        const maxPage = Math.ceil(allJobs.length / 8);
        const displayData: JobDisplayData = {
            title,
            jobs: this.getPagedJobs(allJobs, criteria.page),
            currentPage: criteria.page,
            maxPage
        };

        const embed = this.createEmbed(interaction, displayData);
        const components = this.createComponents(criteria, maxPage);

        return {
            embeds: [embed],
            components
        };
    }

    private getPagedJobs(jobs: JobData[], page: number): JobData[] {
        const start = (page - 1) * 8;
        const end = start + 8;
        return jobs.slice(start, end);
    }

    private createEmbed(interaction: Interaction, displayData: JobDisplayData): EmbedBuilder {
        const { title, jobs, currentPage, maxPage } = displayData;

        const embed = generateEmbed(interaction)
            .setTitle(title)
            .setDescription(`pages: ${currentPage} / ${maxPage}`)
            .setFooter({ text: `pages: ${currentPage} / ${maxPage}` })
            .setColor(0x0099ff);

        jobs.forEach((job: JobData) => {
            embed.addFields({ 
                name: job.name, 
                value: `職業技能: \n${job.skill}\n職業技能ポイント: ${job.point}\n特記: \n${job.detail}` 
            });
        });

        return embed;
    }

    private createComponents(criteria: JobSearchCriteria, maxPage: number): ActionRowBuilder<ButtonBuilder>[] {
        const { query, subcommand, page: currentPage } = criteria;
        const encodedQuery = encodeURIComponent(query);

        const row = new ActionRowBuilder<ButtonBuilder>();

        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`job:first:${encodedQuery}:${subcommand}:1`)
                .setLabel('<<')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage === 1),
            new ButtonBuilder()
                .setCustomId(`job:prev:${encodedQuery}:${subcommand}:${currentPage - 1}`)
                .setLabel('<')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage === 1),
            new ButtonBuilder()
                .setCustomId(`job:next:${encodedQuery}:${subcommand}:${currentPage + 1}`)
                .setLabel('>')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage === maxPage),
            new ButtonBuilder()
                .setCustomId(`job:last:${encodedQuery}:${subcommand}:${maxPage}`)
                .setLabel('>>')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage === maxPage)
        );

        return [row];
    }
}