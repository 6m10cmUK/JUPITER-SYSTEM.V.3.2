import { EmbedBuilder } from 'discord.js';

function createEmbed(title: string, name: string, description: string) {
    return new EmbedBuilder()
        .setTitle(title)
        .setFields(
            { 
                name: name, 
                value: description, 
            }
        )
}

export function createSuccessMessage(title: string, description: string) {
    return {
        embeds: [
            createEmbed(`✅ SUCCESS`, title, description)
                .setColor(0x00ff00)
        ],
        ephemeral: true
    };
}

export function createErrorMessage(title: string, description: string) {
    return {
        embeds: [
            createEmbed(`❌ ERROR`, title, description)
                .setColor(0xff0000)
        ],
        ephemeral: true
    };
}

export function createInfoMessage(title: string, description: string) {
    return {
        embeds: [
            createEmbed(`ℹ️ INFO`, title, description)
                .setColor(0x0099ff)
        ],
        ephemeral: true
    };
} 