import { 
    ButtonInteraction, 
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} from 'discord.js';
import { StatusData, StatKey, statOrder } from '../types/statusData';
import { createStatusDisplay } from '../commons/createStatusDisplay';
export const prefix = 'changeName';

export async function execute(interaction: ButtonInteraction) {
    const [_, messageId, userId] = interaction.customId.split(':');

    const modal = new ModalBuilder()
        .setCustomId(`nameChange:${messageId}:${userId}`)
        .setTitle('キャラクター名変更');

    const nameInput = new TextInputBuilder()
        .setCustomId('name')
        .setLabel('新しい名前を入力してください')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput);

    modal.addComponents(firstActionRow);

    await interaction.showModal(modal);

    interaction.client.on('interactionCreate', async (modalInteraction) => {
        if (!modalInteraction.isModalSubmit()) return;
        if (modalInteraction.customId !== `nameChange:${messageId}:${userId}`) return;

        const newName = modalInteraction.fields.getTextInputValue('name');
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



    var history = fields.find(field => field.name === "変更履歴")?.value ?? '';
    if (history.length > 1) {
        history += "\n";
    }

    let rerollCount = 0;
    fields.forEach(field => {
        const match = field.value.match(/\*\*振り直し回数\s*:\s*(\d+)\*\*/);
        if (match) {
            rerollCount = parseInt(match[1], 10);
        }
    });

    const display = await createStatusDisplay(
        interaction,
        statusData as StatusData,
        messageId,
        rerollCount,
        history,
        newName,
        ver
    );

    await originalMessage.edit(display);
    await modalInteraction.deferUpdate();
    });
} 