import { ButtonInteraction } from 'discord.js';
import { JobEmbedFormatter } from '../presentation/formatters/JobEmbedFormatter';
import { JobSearchCriteria } from '../application/dto/JobDto';

export const prefix = 'job';

export async function execute(interaction: ButtonInteraction) {
    const [_, type, query, subcommand, page] = interaction.customId.split(':');
    if (!type || !subcommand || !page) {
        console.error('Invalid customId format:', interaction.customId);
        return;
    }
    
    const formatter = new JobEmbedFormatter();
    const criteria: JobSearchCriteria = {
        query: decodeURIComponent(query),
        subcommand: subcommand as JobSearchCriteria['subcommand'],
        page: Number(page)
    };
    
    const display = await formatter.format(interaction, criteria);
    await interaction.update(display);
}