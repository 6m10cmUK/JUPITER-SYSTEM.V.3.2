"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prefix = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const statusData_1 = require("../types/statusData");
const createStatusDisplay_1 = require("../commons/createStatusDisplay");
const rollAllStats_1 = require("../commons/rollAllStats");
const embedGenerator_1 = require("../commons/embedGenerator");
const messages_1 = require("../commons/messages");
exports.prefix = 'reroll';
async function execute(interaction) {
    const [_, messageId, userId] = interaction.customId.split(':');
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
    const statusData = {
        details: {}
    };
    const name = embed.data.description?.split('NAME: ')[1] ?? 'キャラクター名';
    const ver = embed.data.footer?.text ?? '6';
    let rerollCount = 0;
    let resultTitle = {};
    statusData_1.statOrder.forEach((stat, index) => {
        const field = fields[index];
        if (field) {
            const statValue = parseInt(field.name.match(/\d+$/)?.[0] || '0', 10);
            statusData[stat] = statValue;
            statusData.details[stat] = field.value;
            resultTitle[stat] = field.name;
        }
    });
    fields.forEach(field => {
        const match = field.value.match(/\*\*振り直し回数\s*:\s*(\d+)\*\*/);
        if (match) {
            rerollCount = parseInt(match[1], 10);
        }
    });
    rerollCount++;
    const display = await (0, createStatusDisplay_1.createStatusDisplay)(interaction, statusData, messageId, rerollCount, fields.find(field => field.name === "変更履歴")?.value ?? '', name, ver);
    await message.edit(display);
    const rerollResult = (0, rollAllStats_1.rollIndividualStatus)(interaction.values[0]);
    const rerollEmbed = (0, embedGenerator_1.generateEmbed)(interaction)
        .setTitle(`${resultTitle[interaction.values[0]]} ＞＞＞ ${rerollResult.result} (${rerollResult.details})`);
    const components = new discord_js_1.ActionRowBuilder()
        .addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId(`confirmReroll:${interaction.values[0]}:${rerollResult.result}:${rerollResult.details}:${messageId}:${rerollCount}:${userId}`)
        .setLabel('確定')
        .setStyle(discord_js_1.ButtonStyle.Primary));
    await interaction.reply({ embeds: [rerollEmbed], components: [components] });
}
