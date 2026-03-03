import { Client, GatewayIntentBits, ActivityType } from 'discord.js';
import { DiscordAdapter } from './adapters/discord/DiscordAdapter';
import * as dotenv from 'dotenv';
import * as packageJson from '../package.json';
import { createServer } from 'http';
import { WebSocketServer } from './infrastructure/websocket/WebSocketServer';
import { NotificationScheduler } from './infrastructure/services/NotificationScheduler';
dotenv.config();

async function main() {
    const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
    if (!DISCORD_TOKEN) {
        throw new Error('DISCORD_TOKEN 環境変数が設定されていません');
    }

    const PORT = parseInt(process.env.PORT || '8080');
    if (isNaN(PORT) || PORT < 1 || PORT > 65535) {
        throw new Error(`無効なポート番号です: ${process.env.PORT}`);
    }

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
    const wsServer = new WebSocketServer(server, PORT);

    // NotificationSchedulerの初期化（起動時にスケジュールを復元）
    const scheduler = new NotificationScheduler(wsServer);

    // DiscordAdapterにWebSocketサーバーを渡す
    const discordAdapter = new DiscordAdapter(client, wsServer);
    await discordAdapter.waitForInit();

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
    server.listen(PORT, () => {
        console.log(`サーバーがポート ${PORT} で起動しました`);
        console.log(`WebSocketも同じポートで待機中`);
    });

    await client.login(DISCORD_TOKEN);
}

main().catch(err => {
    console.error('起動エラー:', err);
    process.exit(1);
});
