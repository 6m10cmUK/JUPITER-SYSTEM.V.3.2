"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.command = void 0;
const discord_js_1 = require("discord.js");
exports.command = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('hello')
        .setDescription('挨拶するよ'),
    async execute(interaction) {
        await interaction.reply('こんにちは！');
    }
};
