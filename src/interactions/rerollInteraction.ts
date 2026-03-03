import { StringSelectMenuInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { generateEmbed } from '../presentation/discord/builders/embedGenerator';
import { checkOwnerPermission } from '../shared/utils/interactionGuards';
import { StatusEmbedParser } from '../presentation/parsers/StatusEmbedParser';
import { StatusEmbedFormatter } from '../presentation/formatters/StatusEmbedFormatter';
import { StatusComponentBuilder } from '../presentation/discord/builders/StatusComponentBuilder';
import { escapeDiscordMarkdown } from '../shared/utils/discordUtils';
import { RerollStatusUseCase } from '../application/use-cases/status/RerollStatusUseCase';

export const prefix = 'reroll';

export async function execute(interaction: StringSelectMenuInteraction) {
    const [_, messageId, userId] = interaction.customId.split(':');

    // 権限チェック
    if (!await checkOwnerPermission(interaction, userId, 'REROLL FAILED')) return;

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
    
    // 振り直し処理を実行
    const rerollUseCase = new RerollStatusUseCase();
    const rerollResult = rerollUseCase.reroll(selectedStat, statusData, messageId);

    // 現在のステータス値を取得
    const currentValue = statusData.primaryStats[selectedStat];

    // 振り直し結果の表示（マークダウンをエスケープ）
    const escapedDetails = escapeDiscordMarkdown(rerollResult.details);
    const rerollEmbed = generateEmbed(interaction)
        .setTitle(`${selectedStat}: ${currentValue} ＞＞＞ ${rerollResult.value} ${escapedDetails}`);
    
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