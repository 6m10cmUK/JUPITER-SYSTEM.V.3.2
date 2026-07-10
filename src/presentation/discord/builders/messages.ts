import { generateEmbed } from './embedGenerator';
import { Message, Interaction } from 'discord.js';
import * as packageJson from '../../../../package.json';
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

function createDescriptionEmbed(source: Message | Interaction, title: string, description: string) {
    return generateEmbed(source)
        .setTitle(title)
        .setDescription(description)
}

export function createSuccessMessage(source: Message | Interaction, title: string, description: string) {
    return {
        embeds: [
            createEmbed(source, `✅ SUCCESS`, `[JUPITER-SYSTEM ${packageJson.version}] ${title}`, description)
                .setColor(0x00ff00)
        ]
    };
}

export function createErrorMessage(source: Message | Interaction, title: string, description: string) {
    return {
        embeds: [
            createEmbed(source, `❌ ERROR`, `[JUPITER-SYSTEM ${packageJson.version}] ${title}`, description)
                .setColor(0xff0000)
        ]
    };
}

export function createInfoMessage(source: Message | Interaction, title: string, description: string) {
    return {
        embeds: [
            createEmbed(source, `ℹ️ INFO`, `[JUPITER-SYSTEM ${packageJson.version}] ${title}`, description)
                .setColor(0x0099ff)
        ]
    };
}

/**
 * description を使う INFO メッセージを作成
 * @param source Discord メッセージまたはインタラクション
 * @param title タイトル
 * @param description 本文
 */
export function createInfoDescriptionMessage(source: Message | Interaction, title: string, description: string) {
    return {
        embeds: [
            createDescriptionEmbed(
                source,
                `ℹ️ INFO - [JUPITER-SYSTEM ${packageJson.version}] ${title}`,
                description
            )
                .setColor(0x0099ff)
        ]
    };
}
