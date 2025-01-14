"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStatusDisplay = createStatusDisplay;
exports.updateStatusDisplay = updateStatusDisplay;
const discord_js_1 = require("discord.js");
const statusData_1 = require("../types/statusData");
async function createStatusDisplay(interaction, stats, messageId, rerollCount, history) {
    const userId = interaction.user.id;
    const embed = await createStatusEmbed(interaction, stats, userId, rerollCount, history);
    const components = createStatusComponents(stats, messageId, userId);
    return {
        embeds: [embed],
        components: [components]
    };
}
async function createStatusEmbed(interaction, stats, userId, rerollCount, history) {
    const user = await interaction.client.users.fetch(userId);
    const embed = new discord_js_1.EmbedBuilder()
        .setColor(0x888888)
        .setAuthor({
        name: user.username,
        iconURL: user.displayAvatarURL()
    })
        .setTitle('CoC 6th CHAR STATUS');
    const total = statusData_1.statOrder.reduce((sum, stat) => sum + stats[stat], 0);
    const db = calculateDamageBonus(stats.siz, stats.str);
    const luc = (stats.pow * 5).toString();
    const knw = (stats.edu * 5).toString();
    const ida = (stats.int * 5).toString();
    const hp = Math.ceil((stats.con + stats.siz) / 2).toString();
    const mp = stats.pow.toString();
    const san = (stats.pow * 5).toString();
    const job_point = (stats.edu * 20).toString();
    const inter_point = (stats.int * 10).toString();
    embed.addFields(...statusData_1.statOrder.map((stat, index) => ({
        name: `${index + 1}️⃣ ${stat.toUpperCase()}: ${stats[stat]}`,
        value: stats.details[stat] || '(詳細なし)',
        inline: true
    })));
    embed.addFields({ name: '\u200B', value: '\u200B', inline: true }, { name: `Total: ${total}`, value: `**DB: ${db}**`, inline: false }, { name: `LUC: ${luc}\nKNW: ${knw}\nIDA: ${ida}`, value: '\u200B', inline: true }, { name: `HP: ${hp}\nMP: ${mp}\nSAN: ${san}`, value: '\u200B', inline: true }, { name: `基礎職業P: ${job_point} 興味P: ${inter_point}`, value: `**振り直し回数: ${rerollCount}**`, inline: false }, { name: `変更履歴`, value: history || '\u200B', inline: false });
    return embed;
}
function createStatusComponents(stats, messageId, userId) {
    const row = new discord_js_1.ActionRowBuilder()
        .addComponents(new discord_js_1.StringSelectMenuBuilder()
        .setCustomId(`reroll:${messageId}:${userId}`)
        .setPlaceholder('振り直すステータス')
        .addOptions(statusData_1.statOrder.map(stat => ({
        label: `${statusData_1.statOrder.indexOf(stat) + 1}️⃣ ${stat.toUpperCase()}`,
        value: stat,
        description: `${stats[stat] ?? 0} ${stats.details?.[stat] || ''}`
    }))));
    return row;
}
function calculateDamageBonus(siz, str) {
    const total = siz + str;
    if (total <= 12) {
        return '-1D6';
    }
    else if (total <= 16) {
        return '-1D4';
    }
    else if (total <= 24) {
        return '±0';
    }
    else if (total <= 32) {
        return '+1D4';
    }
    else {
        return '+1D6';
    }
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
async function updateStatusDisplay(originalEmbed, statType, newValue, diceDetail, rerollCount, messageId) {
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
        .addOptions(statusData_1.statOrder.map((key, index) => ({
        label: `${index + 1}️⃣ ${key.toUpperCase()}: ${stats[key]}`,
        value: messageId ? `${messageId}:${key}` : key
    }))));
    return {
        embed,
        components: [row]
    };
}
