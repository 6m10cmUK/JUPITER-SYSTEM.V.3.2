import { 
    StringSelectMenuInteraction, 
    ActionRowBuilder, 
    ButtonBuilder,
    ButtonStyle
} from 'discord.js';
import { generateEmbed } from '../presentation/discord/builders/embedGenerator';
import { checkOwnerPermission } from '../shared/utils/interactionGuards';
import { StatusEmbedParser } from '../presentation/parsers/StatusEmbedParser';

export const prefix = 'changeSelector';

export async function execute(interaction: StringSelectMenuInteraction) {
    const [_, stat, messageId, userId] = interaction.customId.split(':');

    // 権限チェック
    if (!await checkOwnerPermission(interaction, userId, 'CHANGE FAILED')) return;

    const errorMessage = (content: string) => interaction.reply({ content, ephemeral: true });

    if (!interaction.channel) {
        await errorMessage('チャンネルが見つかりませんでした');
        return;
    }

    // メッセージとEmbedの取得
    const message = await interaction.channel.messages.fetch(messageId);
    if (!message) {
        await errorMessage('メッセージが見つかりませんでした');
        return;
    }

    const embed = message.embeds[0];
    if (!embed) {
        await errorMessage('embedデータが見つかりませんでした');
        return;
    }

    // EmbedからStatusResultDtoを復元
    const parser = new StatusEmbedParser();
    const statusData = parser.parse(embed);
    
    if (!statusData) {
        await errorMessage('ステータスデータの解析に失敗しました');
        return;
    }

    // 大文字に変換
    const beforeStat = stat.toUpperCase();
    const afterStat = interaction.values[0].toUpperCase();

    const beforeValue = statusData.primaryStats[beforeStat];
    const afterValue = statusData.primaryStats[afterStat];

    const newEmbed = generateEmbed(interaction)
        .setTitle(`${beforeStat}: ${beforeValue} ⇄ ${afterStat}: ${afterValue}`);

    const newComponents = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`changeConfirm:${stat}:${interaction.values[0]}:${messageId}:${userId}`)
                .setLabel('確定')
                .setStyle(ButtonStyle.Success)
        );
        
    await interaction.update({ embeds: [newEmbed], components: [newComponents] });
}