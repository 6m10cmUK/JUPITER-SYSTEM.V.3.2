"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStatusEmbed = createStatusEmbed;
exports.updateStatusEmbed = updateStatusEmbed;
exports.createStatusDisplay = createStatusDisplay;
exports.updateStatusDisplay = updateStatusDisplay;
const discord_js_1 = require("discord.js");
const stats_1 = require("./stats");
const status_1 = require("../types/status");
function createStatusEmbed(stats, diceDetails = {}, rerollCount = 0, history = '') {
    const fields = [];
    let total = 0;
    // ステータスフィールドを作成
    status_1.statOrder.forEach((key, index) => {
        const value = stats[key];
        if (value !== undefined) {
            total += value;
            fields.push({
                name: `${index + 1}️⃣ ${key.toUpperCase()}: ${value}`,
                value: diceDetails[key] ?? '---',
                inline: true
            });
        }
    });
    // Total
    fields.push({ name: 'Total', value: total.toString(), inline: true });
    // DB
    const derivedStats = (0, stats_1.calculateDerivedStats)(stats);
    fields.push({
        name: 'DB',
        value: derivedStats.db,
        inline: false
    });
    // LUC/KNW/IDA
    fields.push({
        name: `LUC: ${derivedStats.san}\nKNW: ${derivedStats.knowledge}\nIDA: ${derivedStats.idea}`,
        value: '---',
        inline: true
    });
    // HP/MP/SAN
    fields.push({
        name: `HP: ${derivedStats.hp}\nMP: ${derivedStats.mp}\nSAN: ${derivedStats.san}`,
        value: '---',
        inline: true
    });
    // 基礎職業Pと興味P
    if (stats.edu && stats.int) {
        fields.push({
            name: `基礎職業P: ${stats.edu * 20} 興味P: ${stats.int * 10}`,
            value: `**振り直し回数: ${rerollCount}**`,
            inline: false
        });
    }
    // 変更履歴
    if (history) {
        fields.push({ name: '変更履歴', value: history, inline: false });
    }
    return new discord_js_1.EmbedBuilder()
        .setFields(fields)
        .setColor(0x888888);
}
function updateStatusEmbed(originalEmbed, statType, newValue, diceDetail, rerollCount) {
    const fields = [...originalEmbed.fields];
    // ステータス値の更新
    const statIndex = fields.findIndex(field => field.name.toLowerCase().includes(statType.toLowerCase()));
    if (statIndex !== -1) {
        const oldValue = Number(fields[statIndex].name.match(/\d+$/)?.[0] ?? 0);
        fields[statIndex] = {
            name: fields[statIndex].name.replace(/\d+$/, newValue.toString()),
            value: diceDetail,
            inline: true
        };
        // Total値の更新
        const totalIndex = fields.findIndex(field => field.name === 'Total');
        if (totalIndex !== -1) {
            const totalValue = Number(fields[totalIndex].value) - oldValue + newValue;
            fields[totalIndex].value = totalValue.toString();
        }
        // 振り直し回数の更新
        const rerollField = fields.find(field => field.value.includes('振り直し回数:'));
        if (rerollField) {
            rerollField.value = `**振り直し回数: ${rerollCount}**`;
        }
        // 変更履歴の更新
        const historyField = fields.find(field => field.name === '変更履歴');
        if (historyField) {
            historyField.value = `${historyField.value}${statType.toUpperCase()} ${oldValue} → ${newValue} | `;
        }
        else {
            fields.push({
                name: '変更履歴',
                value: `${statType.toUpperCase()} ${oldValue} → ${newValue} | `,
                inline: false
            });
        }
    }
    return new discord_js_1.EmbedBuilder()
        .setFields(fields)
        .setColor(0x888888);
}
function createStatusDisplay(stats, diceDetails = {}, rerollCount = 0, history = '', messageId) {
    const embed = createStatusEmbed(stats, diceDetails, rerollCount, history);
    const row = new discord_js_1.ActionRowBuilder()
        .addComponents(new discord_js_1.StringSelectMenuBuilder()
        .setCustomId(messageId ? `reroll:${messageId}` : 'reroll')
        .setPlaceholder('振り直すステータス')
        .addOptions(status_1.statOrder.map((key, index) => ({
        label: `${index + 1}️⃣ ${key.toUpperCase()}: ${stats[key]}`,
        value: messageId ? `${messageId}:${key}` : key
    }))));
    return {
        embed,
        components: [row]
    };
}
function updateStatusDisplay(originalEmbed, statType, newValue, diceDetail, rerollCount, messageId) {
    const embed = updateStatusEmbed(originalEmbed, statType, newValue, diceDetail, rerollCount);
    // 現在のステータスを取得
    const stats = {};
    originalEmbed.fields.forEach((field) => {
        const match = field.name.match(/([A-Z]+): (\d+)/);
        if (match) {
            stats[match[1].toLowerCase()] = Number(match[2]);
        }
    });
    stats[statType.toLowerCase()] = newValue;
    const row = new discord_js_1.ActionRowBuilder()
        .addComponents(new discord_js_1.StringSelectMenuBuilder()
        .setCustomId(messageId ? `reroll:${messageId}` : 'reroll')
        .setPlaceholder('振り直すステータス')
        .addOptions(status_1.statOrder.map((key, index) => ({
        label: `${index + 1}️⃣ ${key.toUpperCase()}: ${stats[key]}`,
        value: messageId ? `${messageId}:${key}` : key
    }))));
    return {
        embed,
        components: [row]
    };
}
