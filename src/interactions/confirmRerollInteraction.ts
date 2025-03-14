import { ButtonInteraction } from 'discord.js';
import { createStatusDisplay } from '../commons/createStatusDisplay';
import { StatusData, StatKey, statOrder } from '../types/statusData';
import { generateEmbed } from '../commons/embedGenerator';
import { createErrorMessage } from '../commons/messages';
export const prefix = 'confirmReroll';

export async function execute(interaction: ButtonInteraction) {
    const [_, statType, rerollResult, details, messageId, rerollCount, userId] = interaction.customId.split(':');


    const user = await interaction.client.users.fetch(userId);
    if(user.id !== interaction.user.id) {
        await interaction.reply(createErrorMessage(interaction, `REROLL FAILED`, 'This command can only be used on your own character.'));
        return;
    }


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

    const name = embed.data.title?.split('NAME: ')[1] ?? 'キャラクター名';
    const ver = embed.data.footer?.text ?? '6';

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
    console.log(history);
    if (history.length > 1) {
        history += "\n";
    }
    history += `${statType.toUpperCase()}: ${oldValue} → ${rerollResult} ${details}`;

    const display = await createStatusDisplay(
        interaction,
        statusData as StatusData,
        messageId,
        Number(rerollCount),
        history,
        name,
        ver
    );

    await originalMessage.edit(display);

    const rerollEmbed = generateEmbed(interaction)
    .setTitle(`~~${interaction.message.embeds[0].title}~~`)
    
    interaction.update({
        embeds: [rerollEmbed],
        components: []
    });
}

