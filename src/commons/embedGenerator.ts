import { EmbedBuilder, Interaction, Message } from "discord.js";

export function generateEmbed(source: Interaction | Message) {
    const name = source instanceof Message ? source.author.displayName : source.user.displayName;
    const iconURL = source instanceof Message ? source.author.displayAvatarURL() : source.user.displayAvatarURL();

    return new EmbedBuilder()
        .setAuthor({
            name,
            iconURL
        })
}