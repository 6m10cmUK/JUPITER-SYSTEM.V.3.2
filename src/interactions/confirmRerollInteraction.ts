import { ButtonInteraction } from 'discord.js';
import { generateEmbed } from '../presentation/discord/builders/embedGenerator';
import { checkOwnerPermission } from '../shared/utils/interactionGuards';
import { StatusEmbedParser } from '../presentation/parsers/StatusEmbedParser';
import { StatusEmbedFormatter } from '../presentation/formatters/StatusEmbedFormatter';
import { StatusComponentBuilder } from '../presentation/discord/builders/StatusComponentBuilder';
import { DiceExpressionParser } from '../domain/services/DiceExpressionParser';
import { escapeDiscordMarkdown, unescapeDiscordMarkdown } from '../shared/utils/discordUtils';
import { RerollStatusUseCase } from '../application/use-cases/status/RerollStatusUseCase';

export const prefix = 'confirmReroll';

export async function execute(interaction: ButtonInteraction) {
    const [_, statType, rerollResult, details, messageId, rerollCount, userId] = interaction.customId.split(':');

    // 権限チェック
    if (!await checkOwnerPermission(interaction, userId, 'REROLL FAILED')) return;

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

    // 現在の詳細からダイス式を抽出
    const currentDetails = statusData.primaryStatsDetails[statType];
    const rawDiceExpression = DiceExpressionParser.extractDiceExpression(currentDetails);
    const customDiceExpression = rawDiceExpression ? unescapeDiscordMarkdown(rawDiceExpression) : null;

    // エスケープ処理
    const escapedDetails = escapeDiscordMarkdown(details);
    const escapedDiceExpression = customDiceExpression ? escapeDiscordMarkdown(customDiceExpression) : null;

    // RerollStatusUseCaseで振り直し確定処理を実行
    const rerollUseCase = new RerollStatusUseCase();
    const updatedData = rerollUseCase.confirmReroll(
        statusData,
        statType,
        Number(rerollResult),
        escapedDetails,
        Number(rerollCount),
        escapedDiceExpression,
        details,
        customDiceExpression
    );
    const mergedData = { ...statusData, ...updatedData };

    // ステータス表示を更新
    const formatter = new StatusEmbedFormatter();
    const updatedEmbed = await formatter.format(mergedData, interaction);
    const components = StatusComponentBuilder.createComponents(mergedData, messageId, userId);

    await originalMessage.edit({ embeds: [updatedEmbed], components });

    // 振り直し確定のメッセージを更新
    const rerollEmbed = generateEmbed(interaction)
        .setTitle(`~~${interaction.message.embeds[0].title}~~`);
    
    await interaction.update({
        embeds: [rerollEmbed],
        components: []
    });
}