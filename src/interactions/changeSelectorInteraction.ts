import { 
    StringSelectMenuInteraction, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder,
    ButtonStyle
} from 'discord.js';
import { StatusData, StatKey, statOrder } from '../types/statusData';

export const prefix = 'changeSelector';

export async function execute(interaction: StringSelectMenuInteraction) {

    const [_, stat, messageId, userId] = interaction.customId.split(':');

    const user = await interaction.client.users.fetch(userId);

    const errorMessage = (content: string) => interaction.reply({ content, ephemeral: true });

    if (!interaction.channel) {
        await errorMessage('チャンネルが見つかりませんでした');
        return;
    }

    const message = await interaction.channel.messages.fetch(messageId);
    if (!message) {
        await errorMessage('メッセージが見つかりませんでした');
        return;
    }

    const embed = message.embeds[0];
    if (!embed || !embed.data?.fields?.[0]) {
        await errorMessage('embedまたはフィールドデータが見つかりませんでした');
        return;
    }

    const fields = embed.data.fields;

    const statusData: Partial<StatusData> & { details: { [key: string]: string } } = {
        details: {}
    };

    let resultTitle: { [key in StatKey]?: string } = {};

    statOrder.forEach((stat, index) => {
        const field = fields[index];
        if (field) {
            const statValue = parseInt(field.name.match(/\d+$/)?.[0] || '0', 10);
            statusData[stat as StatKey] = statValue;
            statusData.details[stat] = field.value;
            resultTitle[stat] = field.name;
        }
    });



    const newEmbed = new EmbedBuilder()
        .setTitle(`${resultTitle[stat as StatKey]} ⇄ ${resultTitle[interaction.values[0] as StatKey]}`)
        .setAuthor({ name: `${user.username}`, iconURL: user.displayAvatarURL() });

    const newComponents = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
            .setCustomId(`changeConfirm:${interaction.values[0]}:${stat}:${messageId}:${userId}`)
            .setLabel('確定')
            .setStyle(ButtonStyle.Success)
        );
    await interaction.update({ embeds: [newEmbed], components: [newComponents] });
} 