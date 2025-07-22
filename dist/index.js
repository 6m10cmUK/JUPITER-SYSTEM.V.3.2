"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const DiscordAdapter_1 = require("./adapters/discord/DiscordAdapter");
const dotenv = __importStar(require("dotenv"));
const packageJson = __importStar(require("../package.json"));
const http_1 = require("http");
const WebSocketServer_1 = require("./infrastructure/websocket/WebSocketServer");
dotenv.config();
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
// HTTPサーバーとWebSocketサーバーの初期化
const server = (0, http_1.createServer)();
const PORT = parseInt(process.env.PORT || '8080');
const wsServer = new WebSocketServer_1.WebSocketServer(server, PORT);
// DiscordAdapterにWebSocketサーバーを渡す
const discordAdapter = new DiscordAdapter_1.DiscordAdapter(client, wsServer);
client.once('ready', () => {
    console.log('JUPITER-SYSTEM.V.3.2 is ready.');
    // ボットのステータスを設定
    client.user?.setPresence({
        activities: [{
                name: `ver.${packageJson.version} `,
                type: discord_js_1.ActivityType.Playing
            }],
        status: 'online'
    });
});
client.on('messageCreate', async (message) => {
    if (message.author.bot)
        return;
    await discordAdapter.handleMessage(message);
});
// サーバーを起動
server.listen(PORT, () => {
    console.log(`サーバーがポート ${PORT} で起動しました`);
    console.log(`WebSocketも同じポートで待機中`);
});
client.login(process.env.DISCORD_TOKEN);
