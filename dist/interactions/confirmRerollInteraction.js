"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prefix = void 0;
exports.execute = execute;
const createStatusDisplay_1 = require("../commons/createStatusDisplay");
const statusData_1 = require("../types/statusData");
const embedGenerator_1 = require("../commons/embedGenerator");
const messages_1 = require("../commons/messages");
exports.prefix = 'confirmReroll';
async function execute(interaction) {
    const [_, statType, rerollResult, details, messageId, rerollCount, userId] = interaction.customId.split(':');
    const user = await interaction.client.users.fetch(userId);
    if (user.id !== interaction.user.id) {
        await interaction.reply((0, messages_1.createErrorMessage)(interaction, `REROLL FAILED`, 'This command can only be used on your own character.'));
        return;
    }
    // 元のメッセージを取得
    const originalMessage = await interaction.channel?.messages.fetch(messageId);
    if (!originalMessage) {
        await interaction.reply({ content: 'メッセージが見つからないよ...', ephemeral: true });
        return;
    }
    const errorMessage = (content) => interaction.reply({ content, ephemeral: true });
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
    const name = embed.data.description?.split('NAME: ')[1] ?? 'キャラクター名';
    const ver = embed.data.footer?.text ?? '6';
    const statusData = {
        details: {}
    };
    statusData_1.statOrder.forEach((stat, index) => {
        const field = fields[index];
        if (field) {
            const statValue = parseInt(field.name.match(/\d+$/)?.[0] || '0', 10);
            statusData[stat] = statValue;
            statusData.details[stat] = field.value;
        }
    });
    const oldValue = statusData[statType];
    statusData[statType] = Number(rerollResult);
    statusData.details[statType] = details;
    console.log(statusData, rerollCount);
    var history = fields.find(field => field.name === "変更履歴")?.value ?? '';
    console.log(history);
    if (history.length > 1) {
        history += "\n";
    }
    history += `${statType.toUpperCase()}: ${oldValue} → ${rerollResult} ${details}`;
    const display = await (0, createStatusDisplay_1.createStatusDisplay)(interaction, statusData, messageId, Number(rerollCount), history, name, ver);
    await originalMessage.edit(display);
    const rerollEmbed = (0, embedGenerator_1.generateEmbed)(interaction)
        .setTitle(`~~${interaction.message.embeds[0].title}~~`);
    interaction.update({
        embeds: [rerollEmbed],
        components: []
    });
}
