import { Client, GatewayIntentBits, ActivityType } from 'discord.js';
import { DiscordAdapter } from './adapters/discord/DiscordAdapter';
import * as dotenv from 'dotenv';
import * as packageJson from '../package.json';
import { createServer } from 'http';
import { WebSocketServer } from './infrastructure/websocket/WebSocketServer';
dotenv.config();

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ] 
});

client.on('error', error => {
    console.error('クライアントエラー:', error);
});

process.on('unhandledRejection', error => {
    console.error('未処理のエラー:', error);
});

// HTTPサーバーとWebSocketサーバーの初期化
const server = createServer();
const PORT = parseInt(process.env.PORT || '8080');
const wsServer = new WebSocketServer(server, PORT);

// DiscordAdapterにWebSocketサーバーを渡す
const discordAdapter = new DiscordAdapter(client, wsServer);

client.once('ready', () => {
    console.log('JUPITER-SYSTEM.V.3.2 is ready.');
    
    // ボットのステータスを設定
    client.user?.setPresence({
        activities: [{
            name: `ver.${packageJson.version} `,
            type: ActivityType.Playing
        }],
        status: 'online'
    });
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    await discordAdapter.handleMessage(message);
});

// サーバーを起動
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`サーバーがポート ${PORT} で起動しました`);
    console.log(`WebSocketも同じポートで待機中`);
});

client.login(process.env.DISCORD_TOKEN);
