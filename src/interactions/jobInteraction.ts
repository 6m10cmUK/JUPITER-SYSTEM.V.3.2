import { ButtonInteraction } from 'discord.js';
import { JobEmbedFormatter } from '../presentation/formatters/JobEmbedFormatter';
import { JobSearchCriteria } from '../application/dto/JobDto';
import { logResult } from '../shared/utils/UsageLogger';

export const prefix = 'job';

export async function execute(interaction: ButtonInteraction) {
    const [_, type, query, subcommand, page] = interaction.customId.split(':');
    if (!type || !subcommand || !page) {
        logResult(interaction, `status=failed cause=invalid-custom-id customId=${interaction.customId}`);
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
    logResult(
        interaction,
        `status=success action=${type} subcommand=${criteria.subcommand} page=${criteria.page} displayed=${display.embeds[0]?.data.fields?.length ?? 0}`
    );
}
