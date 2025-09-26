import { ButtonInteraction } from 'discord.js';
import { SecondaryStats } from '../application/dto/StatusDto';
import { generateEmbed } from '../presentation/discord/builders/embedGenerator';
import { createErrorMessage } from '../presentation/discord/builders/messages';
import { StatusEmbedParser } from '../presentation/parsers/StatusEmbedParser';
import { StatusEmbedFormatter } from '../presentation/formatters/StatusEmbedFormatter';
import { StatusComponentBuilder } from '../presentation/discord/builders/StatusComponentBuilder';
import { StatusServiceFactory } from '../domain/services/status/StatusServiceFactory';
import { extractDiceExpression } from '../shared/utils/diceExpressionUtils';
import { escapeDiscordMarkdown } from '../shared/utils/discordUtils';

export const prefix = 'confirmReroll';

export async function execute(interaction: ButtonInteraction) {
    const [_, statType, rerollResult, details, messageId, rerollCount, userId] = interaction.customId.split(':');

    // 権限チェック
    const user = await interaction.client.users.fetch(userId);
    if (user.id !== interaction.user.id) {
        await interaction.reply(createErrorMessage(interaction, `REROLL FAILED`, 'This command can only be used on your own character.'));
        return;
    }

    // エラーメッセージ用のヘルパー
    const errorMessage = (content: string) => interaction.reply({ content, ephemeral: true });

    if (!interaction.channel) {
        await errorMessage('チャンネルが見つかりませんでした');
        return;
    }

    // 元のメッセージを取得
    const originalMessage = await interaction.channel.messages.fetch(messageId);
    if (!originalMessage) {
        await errorMessage('メッセージが見つからないよ...');
        return;
    }

    const embed = originalMessage.embeds[0];
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

    // 古い値を保存
    const oldValue = statusData.primaryStats[statType];

    // 現在の詳細からダイス式を抽出
    const currentDetails = statusData.primaryStatsDetails[statType];
    const customDiceExpression = extractDiceExpression(currentDetails);
    
    // 新しい値で更新
    statusData.primaryStats[statType] = Number(rerollResult);
    
    // カスタムダイス式がある場合は、詳細にダイス式を含める（エスケープ処理）
    if (customDiceExpression) {
        const escapedDiceExpression = escapeDiscordMarkdown(customDiceExpression);
        const escapedDetails = escapeDiscordMarkdown(details);
        statusData.primaryStatsDetails[statType] = `${escapedDiceExpression}: ${escapedDetails}`;
    } else {
        const escapedDetails = escapeDiscordMarkdown(details);
        statusData.primaryStatsDetails[statType] = escapedDetails;
    }
    
    statusData.rerollCount = Number(rerollCount); // 振り直し回数は既に増えているのでそのまま使用

    // 履歴を更新
    if (statusData.history && statusData.history.length > 1) {
        statusData.history += "\n";
    }
    
    // カスタムダイス式が使用されている場合は、それも履歴に記録
    if (customDiceExpression) {
        statusData.history += `${statType}: ${oldValue} → ${rerollResult} ${details} [${customDiceExpression}]`;
    } else {
        statusData.history += `${statType}: ${oldValue} → ${rerollResult} ${details}`;
    }

    // 二次ステータスを再計算
    const statusService = StatusServiceFactory.create(statusData.version);
    statusData.secondaryStats = statusService.calculateSecondaryStats(statusData.primaryStats);

    // ステータス表示を更新
    const formatter = new StatusEmbedFormatter();
    const updatedEmbed = await formatter.format(statusData, interaction);
    const components = StatusComponentBuilder.createComponents(statusData, messageId, userId);

    await originalMessage.edit({ embeds: [updatedEmbed], components });

    // 振り直し確定のメッセージを更新
    const rerollEmbed = generateEmbed(interaction)
        .setTitle(`~~${interaction.message.embeds[0].title}~~`);
    
    await interaction.update({
        embeds: [rerollEmbed],
        components: []
    });
}