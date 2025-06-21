import { EmbedBuilder, Interaction, Message } from "discord.js";
import { embedColor } from '../../../config/discord_config';

export function generateEmbed(source: Interaction | Message) {
    const name = source instanceof Message ? source.author.displayName : source.user.displayName;
    const iconURL = source instanceof Message ? source.author.displayAvatarURL() : source.user.displayAvatarURL();

    return new EmbedBuilder()
        .setColor(embedColor)
        .setAuthor({
            name,
            iconURL
        })
}