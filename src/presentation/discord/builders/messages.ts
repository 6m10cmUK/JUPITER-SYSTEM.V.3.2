import { generateEmbed } from './embedGenerator';
import { Message, Interaction } from 'discord.js';
import { JUPITER_SYSTEM_VERSION } from '../../../config/discord_config';
function createEmbed(source: Message | Interaction, title: string, name: string, description: string) {
    return generateEmbed(source)
        .setTitle(title)
        .setFields(
            { 
                name: name, 
                value: description, 
            }
        )
}

export function createSuccessMessage(source: Message | Interaction, title: string, description: string) {
    return {
        embeds: [
            createEmbed(source, `✅ SUCCESS`, `[JUPITER-SYSTEM ${JUPITER_SYSTEM_VERSION}] ${title}`, description)
                .setColor(0x00ff00)
        ],
        ephemeral: true
    };
}

export function createErrorMessage(source: Message | Interaction, title: string, description: string) {
    return {
        embeds: [
            createEmbed(source, `❌ ERROR`, `[JUPITER-SYSTEM ${JUPITER_SYSTEM_VERSION}] ${title}`, description)
                .setColor(0xff0000)
        ],
        ephemeral: true
    };
}

export function createInfoMessage(source: Message | Interaction, title: string, description: string) {
    return {
        embeds: [
            createEmbed(source, `ℹ️ INFO`, `[JUPITER-SYSTEM ${JUPITER_SYSTEM_VERSION}] ${title}`, description)
                .setColor(0x0099ff)
        ],
        ephemeral: true
    };
} 