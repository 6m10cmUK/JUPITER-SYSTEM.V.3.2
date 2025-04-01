import { ButtonInteraction } from 'discord.js';
import { createNinpoDisplay } from '../commons/createNinpoDisplay';

export const prefix = 'ninpo';

export async function execute(interaction: ButtonInteraction) {
    const [_, action, ryuha, type, pageStr] = interaction.customId.split(':');
    const page = parseInt(pageStr);

    let targetPage = page;
    switch (action) {
        case 'first':
            targetPage = 1;
            break;
        case 'last':
            targetPage = 9999;
            break;
        case 'next':
            targetPage = page + 1;
            break;
        case 'prev':
            targetPage = page - 1;
            break;
    }

    const display = await createNinpoDisplay(interaction, ryuha, type, targetPage);
    await interaction.update(display);
} 