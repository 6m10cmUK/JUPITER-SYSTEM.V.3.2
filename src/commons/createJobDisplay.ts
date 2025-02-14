import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, Interaction, ButtonBuilder, ButtonStyle } from 'discord.js';
import fs from 'fs';
import path from 'path';

interface JobData {
    name: string;
    skill: string;
    point: string;
    detail: string;
}

export async function createJobDisplay(query: string, subcommand: string, page: number) {
    const jobData = await createJobData(query, subcommand);

    const embed = await createJobEmbed(jobData, query, subcommand, page);
    const maxPage = Math.ceil(jobData.length / 8);
    const components = createJobComponents(query, subcommand, page, maxPage);

    return {
        embeds: [embed],
        components: components
    };
}

async function createJobData(query: string, subcommand: string) : Promise<JobData[]> {
    const dataPath = path.join(process.cwd(), 'src', 'data', 'jobs.json');
    const jobData = await JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    let response: JobData[] = [];
    if (subcommand === 'all') {
        response = jobData;
    } else {
        response = await jobData.filter((job: any) => job[subcommand].includes(query));
    }
    return response;
}

async function createJobEmbed(jobDataList: JobData[], query: string, subcommand: string, page: number) {
    let title: string = '職業一覧';

    if (subcommand === 'all') {
        title = '職業一覧';
    } else if (subcommand === 'name') {
        title = '職業名検索：' + query;
    } else if (subcommand === 'skill') {
        title = '職業技能検索：' + query;
    } else if (subcommand === 'point') {
        title = '職業ポイント検索：' + query;
    } else if (subcommand === 'random') {
        title = 'ランダム職業';
        const count = page;
        const randomJobData = jobDataList.sort(() => Math.random() - 0.5).slice(0, count);
        jobDataList = randomJobData;
        page = 1;
    }

    const maxPage = Math.ceil(jobDataList.length / 8);

    const start = (page - 1) * 8;
    const end = start + 8;
    const jobData = jobDataList.slice(start, end);
    
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(`pages: ${page} / ${maxPage}`)
        .setFooter({ text: `pages: ${page} / ${maxPage}` })
        .setColor(0x0099ff);

    jobData.forEach((job: JobData) => {
        embed.addFields({ name: job.name, value: `職業技能: \n${job.skill}\n職業技能ポイント: ${job.point}\n特記: \n${job.detail}` });
    });

    return embed;
}

function createJobComponents(query: string, subcommand: string, page: number, maxPage: number) {
    const row = new ActionRowBuilder<ButtonBuilder>();

    row.addComponents(
        new ButtonBuilder()
            .setCustomId(`job_first_${query}_${subcommand}_1`)
            .setLabel('<<')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === 1),
        new ButtonBuilder()
            .setCustomId(`job_prev_${query}_${subcommand}_${page - 1}`)
            .setLabel('<')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === 1),
        new ButtonBuilder()
            .setCustomId(`job_next_${query}_${subcommand}_${page + 1}`)
            .setLabel('>')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === maxPage),
        new ButtonBuilder()
            .setCustomId(`job_last_${query}_${subcommand}_${maxPage}`)
            .setLabel('>>')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === maxPage)

    );

    return [row];
}