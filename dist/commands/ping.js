"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.command = void 0;
const discord_js_1 = require("discord.js");
exports.command = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('roll')
        .setDescription('ダイスを振る'),
    async execute(interaction) {
        await interaction.reply('Pong!');
    }
};
