import { ButtonInteraction } from 'discord.js';
import { generateEmbed } from '../presentation/discord/builders/embedGenerator';
import { checkOwnerPermission } from '../shared/utils/interactionGuards';
import { StatusEmbedParser } from '../presentation/parsers/StatusEmbedParser';
import { StatusEmbedFormatter } from '../presentation/formatters/StatusEmbedFormatter';
import { StatusComponentBuilder } from '../presentation/discord/builders/StatusComponentBuilder';
import { SwapStatsUseCase } from '../application/use-cases/status/SwapStatsUseCase';

export const prefix = 'changeConfirm';

export async function execute(interaction: ButtonInteraction) {
    console.log(interaction.customId);
    const [_, beforeStat, afterStat, messageId, userId] = interaction.customId.split(':');

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

    // messageIdとuserIdを設定
    statusData.messageId = messageId;
    statusData.userId = userId;

    // ステータスを入れ替え（大文字に変換）
    const beforeStatUpper = beforeStat.toUpperCase();
    const afterStatUpper = afterStat.toUpperCase();

    // SwapStatsUseCaseで入れ替え処理を実行
    const swapUseCase = new SwapStatsUseCase();
    const updatedData = swapUseCase.execute(statusData, beforeStatUpper, afterStatUpper);
    Object.assign(statusData, updatedData);

    // ステータス表示を更新
    const formatter = new StatusEmbedFormatter();
    const updatedEmbed = await formatter.format(statusData, interaction);
    const components = StatusComponentBuilder.createComponents(statusData, messageId, userId);

    await message.edit({ embeds: [updatedEmbed], components });

    // 入れ替え確定のメッセージを更新
    const rerollEmbed = generateEmbed(interaction)
        .setTitle(`~~${beforeStatUpper} ⇄ ${afterStatUpper}~~`);
    
    await interaction.update({ embeds: [rerollEmbed], components: [] });
}