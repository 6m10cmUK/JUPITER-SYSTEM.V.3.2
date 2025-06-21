"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.command = void 0;
const discord_js_1 = require("discord.js");
const createStatusDisplay_1 = require("../presentation/discord/displays/createStatusDisplay");
const createStatusDisplayVer7_1 = require("../presentation/discord/displays/createStatusDisplayVer7");
const rollAllStats_1 = require("../domain/services/rollAllStats");
const rollAllStatsVer7_1 = require("../domain/services/rollAllStatsVer7");
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
            const statsData = (0, rollAllStats_1.rollAllStats)();
            const display = (0, createStatusDisplay_1.createStatusDisplay)(interaction, statsData, messageId, 0, '', name, '6');
            const { embeds, components } = await display;
            await interaction.editReply({ embeds, components });
        }
        else if (type === 'ver7') {
            const statsData = (0, rollAllStatsVer7_1.rollAllStatsVer7)();
            const display = (0, createStatusDisplayVer7_1.createStatusDisplayVer7)(interaction, statsData, messageId, 0, '', name, '7');
            const { embeds, components } = await display;
            await interaction.editReply({ embeds, components });
        }
    }
};
