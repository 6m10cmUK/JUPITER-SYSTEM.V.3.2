"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const DiscordAdapter_1 = require("./adapters/discord/DiscordAdapter");
const MessageUseCase_1 = require("./usecases/MessageUseCase");
const config_json_1 = __importDefault(require("./config.json"));
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.MessageContent
    ]
});
client.on('error', error => {
    console.error('クライアントエラー:', error);
});
process.on('unhandledRejection', error => {
    console.error('未処理のエラー:', error);
});
const discordAdapter = new DiscordAdapter_1.DiscordAdapter(client);
const messageUseCase = new MessageUseCase_1.MessageUseCase();
client.once('ready', () => {
    console.log('JUPITER-SYSTEM.V.3.2 is ready.');
});
client.on('messageCreate', async (message) => {
    if (message.author.bot)
        return;
    await discordAdapter.handleMessage(message, messageUseCase);
});
client.login(config_json_1.default.token);
