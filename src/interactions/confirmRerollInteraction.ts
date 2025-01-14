import { ButtonInteraction, EmbedBuilder } from 'discord.js';
import { createStatusDisplay } from '../commons/createStatus';
import { StatusData, StatKey, statOrder } from '../types/statusData';

export async function handleConfirmRerollInteraction(interaction: ButtonInteraction) {
    const [_, statType, rerollResult, details, messageId, rerollCount] = interaction.customId.split(':');

    // 元のメッセージを取得
    const originalMessage = await interaction.channel?.messages.fetch(messageId);
    if (!originalMessage) {
        await interaction.reply({ content: 'メッセージが見つからないよ...', ephemeral: true });
        return;
    }
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

    console.log(fields);

    const statusData: Partial<StatusData> & { details: { [key: string]: string } } = {
        details: {}
    };

    statOrder.forEach((stat, index) => {
        const field = fields[index];
        if (field) {
            const statValue = parseInt(field.name.match(/\d+$/)?.[0] || '0', 10);
            statusData[stat as StatKey] = statValue;
            statusData.details[stat] = field.value;
        }
    });

    const oldValue = statusData[statType as StatKey];

    statusData[statType as StatKey] = Number(rerollResult);
    statusData.details[statType] = details;

    console.log(statusData, rerollCount);

    var history = fields.find(field => field.name === "変更履歴")?.value ?? '';
    if (Number(rerollCount) > 1) {
        history += "`\n";
    }
    history += `${statType.toUpperCase()}: ${oldValue} → ${rerollResult} ${details}`;

    const display = await createStatusDisplay(
        interaction,
        statusData as StatusData,
        messageId,
        Number(rerollCount),
        history
    );

    await originalMessage.edit(display);

    


    interaction.update({
        embeds: [
            new EmbedBuilder()
                .setTitle(`~~${interaction.message.embeds[0].title}~~`)
                .setAuthor(interaction.message.embeds[0].author)
        ],
        components: []
    });
}

