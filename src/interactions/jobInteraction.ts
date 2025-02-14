import { ButtonInteraction } from 'discord.js';
import { createJobDisplay } from '../commons/createJobDisplay';

export async function handleJobInteraction(interaction: ButtonInteraction) {
    const [_, type, query, subcommand, page] = interaction.customId.split('_');
    console.log(type, query, subcommand, page);
    const display = await createJobDisplay(query, subcommand, Number(page));
    await interaction.update(display);
}