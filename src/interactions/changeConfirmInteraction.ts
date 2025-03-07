import { 
    ButtonInteraction, 
    EmbedBuilder, 
} from 'discord.js';
import { StatusData, StatKey, statOrder } from '../types/statusData';
import { createStatusDisplay } from '../commons/createStatusDisplay';

export const prefix = 'changeConfirm';

export async function execute(interaction: ButtonInteraction) {
    console.log(interaction.customId);
    const [_,beforeStat, afterStat, messageId, userId] = interaction.customId.split(':');

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
    let rerollCount = 0;

        fields.forEach(field => {
        const match = field.value.match(/\*\*振り直し回数\s*:\s*(\d+)\*\*/);
        if (match) {
            rerollCount = parseInt(match[1], 10); // 数字を取得
        }
    });

    const name = embed.data.description?.split('NAME: ')[1] ?? 'キャラクター名';
    const ver = embed.data.footer?.text ?? '6';
    
    const buf = statusData[beforeStat as StatKey]
    statusData[beforeStat as StatKey] = statusData[afterStat as StatKey]
    statusData[afterStat as StatKey] = buf

    const detailBuf = statusData.details[beforeStat as StatKey]
    statusData.details[beforeStat as StatKey] = statusData.details[afterStat as StatKey]
    statusData.details[afterStat as StatKey] = detailBuf

    var history = fields.find(field => field.name === "変更履歴")?.value ?? '';
    if (history.length > 0) {
        history += "\n";
    }
    history += `${beforeStat.toUpperCase()}: ${statusData[beforeStat as StatKey]} ⇄ ${afterStat.toUpperCase()}: ${statusData[afterStat as StatKey]}`;

    const display = await createStatusDisplay(
        interaction,
        statusData as StatusData,
        messageId,
        rerollCount,
        history,
        name,
        ver
    );

    await message.edit(display);


    const rerollEmbed = new EmbedBuilder()
        .setTitle(`~~${resultTitle[afterStat as StatKey]} ⇄ ${resultTitle[beforeStat as StatKey]}~~`)
        .setAuthor({ name: `${user.username}`, iconURL: user.displayAvatarURL() })
    await interaction.update({ embeds: [rerollEmbed], components: []});
} 