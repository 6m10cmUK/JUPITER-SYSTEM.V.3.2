"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.command = void 0;
const discord_js_1 = require("discord.js");
const createJobDisplay_1 = require("../presentation/discord/displays/createJobDisplay");
exports.command = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('job')
        .setDescription('職業検索')
        .addSubcommand((subcommand) => subcommand.setName('name')
        .setDescription('職業名で検索')
        .addStringOption((option) => option.setName('query')
        .setDescription('検索したい職業名')
        .setRequired(true)))
        .addSubcommand((subcommand) => subcommand.setName('skill')
        .setDescription('職業技能で検索')
        .addStringOption((option) => option.setName('query')
        .setDescription('検索したい技能名')
        .setRequired(true)))
        .addSubcommand((subcommand) => subcommand.setName('point')
        .setDescription('職業ポイントで検索')
        .addStringOption((option) => option.setName('query')
        .setDescription('検索したい職業ポイント名')
        .setRequired(true)))
        .addSubcommand((subcommand) => subcommand.setName('all')
        .setDescription('職業一覧'))
        .addSubcommand((subcommand) => subcommand.setName('random')
        .setDescription('ランダムで職業を表示')
        .addIntegerOption((option) => option.setName('count')
        .setDescription('表示する職業の数')
        .setMinValue(1)
        .setMaxValue(8)
        .setRequired(false))),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        await interaction.deferReply();
        const query = interaction.options.getString('query') ?? '';
        if (subcommand === 'random') {
            const count = interaction.options.getInteger('count') ?? 1;
            const display = await (0, createJobDisplay_1.createJobDisplay)(interaction, query, subcommand, count);
            await interaction.editReply(display);
            return;
        }
        const display = await (0, createJobDisplay_1.createJobDisplay)(interaction, query, subcommand, 1);
        await interaction.editReply(display);
    }
};
