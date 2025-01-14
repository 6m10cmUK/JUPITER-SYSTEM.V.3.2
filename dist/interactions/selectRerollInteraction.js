"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSelectRerollInteraction = handleSelectRerollInteraction;
const discord_js_1 = require("discord.js");
const dice_1 = require("../commons/dice");
async function handleSelectRerollInteraction(interaction) {
    const [messageId, statType] = interaction.values[0].split(':');
    // 元のメッセージを取得
    const originalMessage = await interaction.channel?.messages.fetch(messageId);
    if (!originalMessage) {
        await interaction.reply({ content: 'メッセージが見つからないよ...', ephemeral: true });
        return;
    }
    const originalEmbed = originalMessage.embeds[0];
    const rerollCountField = originalEmbed.fields.find(field => field.value.includes('振り直し回数:'));
    const rerollCount = Number(rerollCountField?.value.match(/\d+/)?.[0] ?? 0);
    const rollResult = (0, dice_1.rollDice)(3, 6);
    const newValue = rollResult.reduce((a, b) => a + b, 0);
    const row = new discord_js_1.ActionRowBuilder()
        .addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId(`confirm:${statType}:${newValue}:${messageId}:${rerollCount + 1}`)
        .setLabel('確定')
        .setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder()
        .setCustomId(`cancel:${statType}:${newValue}`)
        .setLabel('キャンセル')
        .setStyle(discord_js_1.ButtonStyle.Secondary));
    await interaction.reply({
        embeds: [{
                author: {
                    name: interaction.user.username,
                    icon_url: interaction.user.displayAvatarURL()
                },
                description: `[${statType.toUpperCase()}] ${newValue} (${rollResult.join(', ')})`,
                color: 0x888888
            }],
        components: [row],
        ephemeral: true
    });
}
