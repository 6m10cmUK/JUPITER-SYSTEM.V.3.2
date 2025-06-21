"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prefix = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const embedGenerator_1 = require("../presentation/discord/builders/embedGenerator");
const messages_1 = require("../presentation/discord/builders/messages");
const StatusEmbedParser_1 = require("../presentation/parsers/StatusEmbedParser");
const StatusEmbedFormatter_1 = require("../presentation/formatters/StatusEmbedFormatter");
const StatusComponentBuilder_1 = require("../presentation/discord/builders/StatusComponentBuilder");
const StatusServiceFactory_1 = require("../domain/services/status/StatusServiceFactory");
const DiceService_1 = require("../domain/services/DiceService");
const DiceExpression_1 = require("../domain/value-objects/DiceExpression");
const diceExpressionUtils_1 = require("../shared/utils/diceExpressionUtils");
const discordUtils_1 = require("../shared/utils/discordUtils");
exports.prefix = 'reroll';
async function execute(interaction) {
    const [_, messageId, userId] = interaction.customId.split(':');
    // 権限チェック
    const user = await interaction.client.users.fetch(userId);
    if (user.id !== interaction.user.id) {
        await interaction.reply((0, messages_1.createErrorMessage)(interaction, `REROLL FAILED`, 'This command can only be used on your own character.'));
        return;
    }
    const errorMessage = (content) => interaction.reply({ content, ephemeral: true });
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
    const parser = new StatusEmbedParser_1.StatusEmbedParser();
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
    let rerollResult;
    // ステータス詳細からダイス式を抽出
    const currentDetails = statusData.primaryStatsDetails[selectedStat];
    const customDiceExpression = (0, diceExpressionUtils_1.extractDiceExpression)(currentDetails);
    if (customDiceExpression) {
        // カスタムダイス式が設定されている場合はそれを使用
        const diceService = new DiceService_1.DiceService();
        const expression = new DiceExpression_1.DiceExpression(customDiceExpression);
        const roll = diceService.roll(expression);
        rerollResult = {
            value: roll.getTotal(),
            details: roll.getDetailedExpression().replace(customDiceExpression + ' ＞ ', '') // ダイス式部分を除去
        };
    }
    else {
        // 通常の振り直し
        const statusService = StatusServiceFactory_1.StatusServiceFactory.create(statusData.version);
        rerollResult = statusService.rollIndividualStat(selectedStat);
    }
    // 現在のステータス値を取得
    const currentValue = statusData.primaryStats[selectedStat];
    // 振り直し結果の表示（マークダウンをエスケープ）
    const escapedDetails = (0, discordUtils_1.escapeDiscordMarkdown)(rerollResult.details);
    const rerollEmbed = (0, embedGenerator_1.generateEmbed)(interaction)
        .setTitle(`${selectedStat}: ${currentValue} ＞＞＞ ${rerollResult.value} (${escapedDetails})`);
    // 振り直し回数はまだ増やさない（成功確認後に増やす）
    const newRerollCount = statusData.rerollCount + 1;
    const components = new discord_js_1.ActionRowBuilder()
        .addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId(`confirmReroll:${selectedStat}:${rerollResult.value}:${rerollResult.details}:${messageId}:${newRerollCount}:${userId}`)
        .setLabel('確定')
        .setStyle(discord_js_1.ButtonStyle.Primary));
    // ステータス表示を更新（振り直し回数はまだ増やさない）
    const formatter = new StatusEmbedFormatter_1.StatusEmbedFormatter();
    const updatedEmbed = await formatter.format(statusData, interaction);
    const components2 = StatusComponentBuilder_1.StatusComponentBuilder.createComponents(statusData, messageId, userId);
    // 先にメッセージを更新
    await message.edit({ embeds: [updatedEmbed], components: components2 });
    try {
        // 振り直し結果を表示
        await interaction.reply({ embeds: [rerollEmbed], components: [components] });
        // リプライが成功した後に振り直し回数を増やす
        statusData.rerollCount = newRerollCount;
        const updatedEmbedWithCount = await formatter.format(statusData, interaction);
        await message.edit({ embeds: [updatedEmbedWithCount], components: components2 });
    }
    catch (error) {
        // エラーが発生した場合は振り直し回数を増やさない
        console.error('振り直し結果の表示に失敗:', error);
        throw error;
    }
}
