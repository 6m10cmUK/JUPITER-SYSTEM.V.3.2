import { StringSelectMenuInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { StatusData, StatKey, statOrder } from '../types/statusData';
import { createStatusDisplay } from '../commons/createStatusDisplay';
import { rollIndividualStatus } from '../commons/rollAllStats';
import { InteractionHandler } from '../interfaces/InteractionHandler';

export const prefix = 'reroll';

export async function execute(interaction: StringSelectMenuInteraction) {
    const [_, messageId, userId] = interaction.customId.split(':');

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

    const name = embed.data.title?.split('NAME: ')[1] ?? 'キャラクター名';
    const ver = embed.data.footer?.text ?? '6';

    let rerollCount = 0;

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

    fields.forEach(field => {
        const match = field.value.match(/\*\*振り直し回数\s*:\s*(\d+)\*\*/);
        if (match) {
            rerollCount = parseInt(match[1], 10);
        }
    });

    rerollCount++;

    const display = await createStatusDisplay(
        interaction,
        statusData as StatusData,
        messageId,
        rerollCount,
        fields.find(field => field.name === "変更履歴")?.value ?? '',
        name,
        ver
    );

    await message.edit(display);

    const rerollResult = rollIndividualStatus(interaction.values[0] as StatKey);

    const rerollEmbed = new EmbedBuilder()
        .setTitle(`${resultTitle[interaction.values[0] as StatKey]} ＞＞＞ ${rerollResult.result} (${rerollResult.details})`)
        .setAuthor({ name: `${user.username}`, iconURL: user.displayAvatarURL() })

    const components = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`confirmReroll:${interaction.values[0]}:${rerollResult.result}:${rerollResult.details}:${messageId}:${rerollCount}`)
                .setLabel('確定')
                .setStyle(ButtonStyle.Primary)
        );

    await interaction.reply({ embeds: [rerollEmbed], components: [components]});
} 