"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.command = void 0;
const discord_js_1 = require("discord.js");
const createStatus_1 = require("../commons/createStatus");
const rollAllStats_1 = require("../commons/rollAllStats");
exports.command = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('status')
        .setDescription('CoCステータス作成コマンド')
        .addStringOption((option) => option.setName('type')
        .setDescription('表示するステータスの種類')
        .setRequired(true)
        .addChoices({ name: '6版', value: 'ver6' }, { name: '7版', value: 'ver7' }))
        .addStringOption((option) => option.setName('name')
        .setDescription('キャラクターの名前')
        .setRequired(false)),
    async execute(interaction) {
        const type = interaction.options.getString('type');
        const name = interaction.options.getString('name') ?? 'キャラクター名';
        // 最初に仮のメッセージを送信
        await interaction.deferReply();
        const replyMessage = await interaction.fetchReply();
        const messageId = replyMessage?.id;
        if (type === 'ver6') {
            const statsData = (0, rollAllStats_1.rollAllStats)(type);
            const display = (0, createStatus_1.createStatusDisplay)(interaction, statsData, messageId, 0, '', name, '6');
            const { embeds, components } = await display;
            await interaction.editReply({ embeds, components });
        }
        else if (type === 'ver7') {
            const statsData = (0, rollAllStats_1.rollAllStats)(type);
            const display = (0, createStatus_1.createStatusDisplay)(interaction, statsData, messageId, 0, '', name, '7');
            const { embeds, components } = await display;
            await interaction.editReply({ embeds, components });
        }
    }
};
