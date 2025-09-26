import { EmbedBuilder, Interaction, Message } from "discord.js";
import { embedColor } from '../../../config/discord_config';

export function generateEmbed(source: Interaction | Message) {
    const name = source instanceof Message 
        ? (source.author?.displayName || source.author?.globalName || source.author?.username || 'Unknown User')
        : (source.user?.displayName || source.user?.globalName || source.user?.username || 'Unknown User');
    const iconURL = source instanceof Message 
        ? (source.author?.displayAvatarURL?.() || 'https://example.com/avatar.png')
        : (source.user?.displayAvatarURL?.() || 'https://example.com/avatar.png');

    return new EmbedBuilder()
        .setColor(embedColor)
        .setAuthor({
            name,
            iconURL
        })
}