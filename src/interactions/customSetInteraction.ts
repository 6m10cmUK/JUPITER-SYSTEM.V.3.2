import { 
    StringSelectMenuInteraction, 
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ModalSubmitInteraction
} from 'discord.js';
import { SecondaryStats } from '../application/dto/StatusDto';
import { generateEmbed } from '../presentation/discord/builders/embedGenerator';
import { createErrorMessage } from '../presentation/discord/builders/messages';
import { StatusEmbedParser } from '../presentation/parsers/StatusEmbedParser';
import { StatusEmbedFormatter } from '../presentation/formatters/StatusEmbedFormatter';
import { StatusComponentBuilder } from '../presentation/discord/builders/StatusComponentBuilder';
import { StatusServiceFactory } from '../domain/services/status/StatusServiceFactory';
import { DiceService } from '../domain/services/DiceService';
import { DiceExpression } from '../domain/value-objects/DiceExpression';
import { escapeDiscordMarkdown } from '../shared/utils/discordUtils';

export const prefix = 'customSet';

export async function execute(interaction: StringSelectMenuInteraction) {
    const [_, messageId, userId] = interaction.customId.split(':');

    // 権限チェック
    if (interaction.user.id !== userId) {
        await interaction.reply(createErrorMessage(interaction, `CUSTOM SET FAILED`, 'This command can only be used on your own character.'));
        return;
    }

    const selectedStat = interaction.values[0].toUpperCase();

    // モーダルを作成
    // モーダルを表示する前に、セレクトメニューをリセットするためにメッセージを更新
    if (interaction.message && interaction.channel) {
        try {
            // 元のメッセージを取得
            const originalMessage = await interaction.channel.messages.fetch(messageId);
            if (originalMessage && originalMessage.embeds[0]) {
                const embed = originalMessage.embeds[0];
                
                // EmbedからStatusResultDtoを復元
                const parser = new StatusEmbedParser();
                const statusData = parser.parse(embed);
                
                if (statusData) {
                    // messageIdとuserIdを設定
                    statusData.messageId = messageId;
                    statusData.userId = userId;
                    
                    // コンポーネントを再生成（セレクトメニューがリセットされる）
                    const components = StatusComponentBuilder.createComponents(statusData, messageId, userId);
                    
                    // メッセージを更新
                    await originalMessage.edit({ embeds: [embed], components });
                }
            }
        } catch (error) {
            console.error('メッセージの更新に失敗:', error);
        }
    }

    const modal = new ModalBuilder()
        .setCustomId(`customSetModal:${selectedStat}:${messageId}:${userId}`)
        .setTitle(`${selectedStat}のカスタムセット`);

    const diceInput = new TextInputBuilder()
        .setCustomId('diceExpression')
        .setLabel('ダイス式を入力してください')
        .setPlaceholder('例: 1d6+12, 3d6, 2d10+5')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const row = new ActionRowBuilder<TextInputBuilder>().addComponents(diceInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
}

// モーダル送信のハンドラー
export async function handleCustomSetModal(interaction: ModalSubmitInteraction) {
    if (!interaction.customId.startsWith('customSetModal:')) return;

    const [_, statType, messageId, userId] = interaction.customId.split(':');
    const diceExpression = interaction.fields.getTextInputValue('diceExpression');

    // 権限チェック
    if (interaction.user.id !== userId) {
        await interaction.reply(createErrorMessage(interaction, `CUSTOM SET FAILED`, 'This command can only be used on your own character.'));
        return;
    }

    const errorMessage = (content: string) => interaction.reply({ content, ephemeral: true });

    if (!interaction.channel) {
        await errorMessage('チャンネルが見つかりませんでした');
        return;
    }

    // 元のメッセージを取得
    const originalMessage = await interaction.channel.messages.fetch(messageId);
    if (!originalMessage) {
        await errorMessage('メッセージが見つかりませんでした');
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

    try {
        // ダイス式を評価
        const diceService = new DiceService();
        const expression = new DiceExpression(diceExpression);
        const roll = diceService.roll(expression);
        
        // 古い値を保存
        const oldValue = statusData.primaryStats[statType];
        
        // ステータスを更新
        statusData.primaryStats[statType] = roll.getTotal();
        // 詳細にダイス式を含める形式: "2d6+6: (4,5)+6"
        const detailedExpression = roll.getDetailedExpression();
        // "2d6+6 ＞ (5,4)+6 ＞ 18" のような形式から "(5,4)+6" の部分を抽出
        const match = detailedExpression.match(/＞\s*(\([^)]+\)[^＞]*)(?:\s*＞|$)/);
        
        // ダイス式と詳細をエスケープして保存
        const escapedDiceExpression = escapeDiscordMarkdown(diceExpression);
        if (match) {
            const escapedResult = escapeDiscordMarkdown(match[1].trim());
            statusData.primaryStatsDetails[statType] = `${escapedDiceExpression}: ${escapedResult}`;
        } else {
            // フォールバック: ダイス式部分を除去
            const cleaned = detailedExpression.replace(new RegExp(`^${diceExpression}\\s*＞\\s*`), '');
            const escapedCleaned = escapeDiscordMarkdown(cleaned);
            statusData.primaryStatsDetails[statType] = `${escapedDiceExpression}: ${escapedCleaned}`;
        }
        
        // 履歴を更新
        if (statusData.history && statusData.history.length > 0) {
            statusData.history += "\n";
        }
        statusData.history += `${statType}: ${oldValue} → ${roll.getTotal()} (カスタムセット: ${diceExpression})`;

        // 二次ステータスを再計算
        const statusService = StatusServiceFactory.create(statusData.version);
        statusData.secondaryStats = statusService.calculateSecondaryStats(statusData.primaryStats) as unknown as SecondaryStats;

        // messageIdとuserIdを設定
        statusData.messageId = messageId;
        statusData.userId = userId;

        // ステータス表示を更新
        const formatter = new StatusEmbedFormatter();
        const updatedEmbed = await formatter.format(statusData, interaction);
        const components = StatusComponentBuilder.createComponents(statusData, messageId, userId);

        await originalMessage.edit({ embeds: [updatedEmbed], components });
        
        // 結果をembedで表示（マークダウンをエスケープ）
        const escapedExpression = escapeDiscordMarkdown(diceExpression);
        const escapedDetails = escapeDiscordMarkdown(roll.getDetailedExpression());
        
        const resultEmbed = generateEmbed(interaction)
            .setTitle(`${statType}: カスタムセット`)
            .setDescription(`${escapedExpression} ＞ ${escapedDetails} ＞ **${roll.getTotal()}**`);
            
        await interaction.reply({ embeds: [resultEmbed] });
    } catch (error) {
        await errorMessage(`ダイス式の評価に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}