import { 
    StringSelectMenuInteraction, 
    ActionRowBuilder, 
    StringSelectMenuBuilder
} from 'discord.js';
import { StatusData, StatKey, statOrder } from '../types/statusData';
import { createStatusDisplay } from '../commons/createStatusDisplay';
import { generateEmbed } from '../commons/embedGenerator';
import { createErrorMessage } from '../commons/messages';

export const prefix = 'change';

export async function execute(interaction: StringSelectMenuInteraction) {
    const [_, messageId, userId] = interaction.customId.split(':');

    const user = await interaction.client.users.fetch(userId);

    if(user.id !== interaction.user.id) {
        await interaction.reply(createErrorMessage(interaction, `REROLL FAILED`, 'This command can only be used on your own character.'));
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


    const rerollEmbed = generateEmbed(interaction)
        .setTitle(`${resultTitle[interaction.values[0] as StatKey]} ⇄`)
        
    const components = new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`changeSelector:${interaction.values[0]}:${messageId}:${userId}`)
                .setPlaceholder(`${interaction.values[0].toUpperCase()}:${statusData[interaction.values[0] as StatKey]}と入れ替えるステータス`)
                .addOptions(
                    statOrder
                    .filter(stat => stat !== interaction.values[0])
                    .map(stat => ({
                        label: `${statOrder.indexOf(stat) + 1}️⃣ ${stat.toUpperCase()}`,
                        value: stat,
                        description: `${statusData[stat as StatKey]} ${statusData.details[stat as StatKey]}`,
                    }))
                )
        );

    await interaction.reply({ embeds: [rerollEmbed], components: [components]});
} 