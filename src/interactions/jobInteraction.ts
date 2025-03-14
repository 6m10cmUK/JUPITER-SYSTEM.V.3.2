import { ButtonInteraction } from 'discord.js';
import { createJobDisplay } from '../commons/createJobDisplay';

export const prefix = 'job';

export async function execute(interaction: ButtonInteraction) {
    const [_, type, query, subcommand, page] = interaction.customId.split(':');
    if (!type || !subcommand || !page) {
        console.error('Invalid customId format:', interaction.customId);
        return;
    }
    const display = await createJobDisplay(interaction, decodeURIComponent(query), subcommand, Number(page));
    await interaction.update(display);
}