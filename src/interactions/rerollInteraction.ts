import { StringSelectMenuInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { generateEmbed } from '../presentation/discord/builders/embedGenerator';
import { createErrorMessage } from '../presentation/discord/builders/messages';
import { StatusEmbedParser } from '../presentation/parsers/StatusEmbedParser';
import { StatusEmbedFormatter } from '../presentation/formatters/StatusEmbedFormatter';
import { StatusComponentBuilder } from '../presentation/discord/builders/StatusComponentBuilder';
import { StatusServiceFactory } from '../domain/services/status/StatusServiceFactory';
import { DiceService } from '../domain/services/DiceService';
import { DiceExpression } from '../domain/value-objects/DiceExpression';
import { extractDiceExpression } from '../shared/utils/diceExpressionUtils';
import { escapeDiscordMarkdown } from '../shared/utils/discordUtils';

export const prefix = 'reroll';

export async function execute(interaction: StringSelectMenuInteraction) {
    const [_, messageId, userId] = interaction.customId.split(':');

    // 権限チェック
    const user = await interaction.client.users.fetch(userId);
    if (user.id !== interaction.user.id) {
        await interaction.reply(createErrorMessage(interaction, `REROLL FAILED`, 'This command can only be used on your own character.'));
        return;
    }

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

    // 選択されたステータスを振り直し
    const selectedStat = interaction.values[0].toUpperCase(); // 大文字に変換
    
    let rerollResult: { value: number; details: string };
    
    // ステータス詳細からダイス式を抽出
    const currentDetails = statusData.primaryStatsDetails[selectedStat];
    const customDiceExpression = extractDiceExpression(currentDetails);
    
    if (customDiceExpression) {
        // カスタムダイス式が設定されている場合はそれを使用
        const diceService = new DiceService();
        const expression = new DiceExpression(customDiceExpression);
        const roll = diceService.roll(expression);
        
        rerollResult = {
            value: roll.getTotal(),
            details: roll.getDetailedExpression().replace(customDiceExpression + ' ＞ ', '') // ダイス式部分を除去
        };
    } else {
        // 通常の振り直し
        const statusService = StatusServiceFactory.create(statusData.version);
        rerollResult = statusService.rollIndividualStat(selectedStat);
    }

    // 現在のステータス値を取得
    const currentValue = statusData.primaryStats[selectedStat];

    // 振り直し結果の表示（マークダウンをエスケープ）
    const escapedDetails = escapeDiscordMarkdown(rerollResult.details);
    const rerollEmbed = generateEmbed(interaction)
        .setTitle(`${selectedStat}: ${currentValue} ＞＞＞ ${rerollResult.value} (${escapedDetails})`);
    
    // 振り直し回数はまだ増やさない（成功確認後に増やす）
    const newRerollCount = statusData.rerollCount + 1;
    
    const components = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`confirmReroll:${selectedStat}:${rerollResult.value}:${rerollResult.details}:${messageId}:${newRerollCount}:${userId}`)
                .setLabel('確定')
                .setStyle(ButtonStyle.Primary)
        );

    // ステータス表示を更新（振り直し回数はまだ増やさない）
    const formatter = new StatusEmbedFormatter();
    const updatedEmbed = await formatter.format(statusData, interaction);
    const components2 = StatusComponentBuilder.createComponents(statusData, messageId, userId);
    
    // 先にメッセージを更新
    await message.edit({ embeds: [updatedEmbed], components: components2 });
    
    try {
        // 振り直し結果を表示
        await interaction.reply({ embeds: [rerollEmbed], components: [components] });
        
        // リプライが成功した後に振り直し回数を増やす
        statusData.rerollCount = newRerollCount;
        const updatedEmbedWithCount = await formatter.format(statusData, interaction);
        await message.edit({ embeds: [updatedEmbedWithCount], components: components2 });
    } catch (error) {
        // エラーが発生した場合は振り直し回数を増やさない
        console.error('振り直し結果の表示に失敗:', error);
        throw error;
    }
}