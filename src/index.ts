import { Client, GatewayIntentBits, ActivityType } from 'discord.js';
import { DiscordAdapter } from './adapters/discord/DiscordAdapter';
import * as dotenv from 'dotenv';
import * as packageJson from '../package.json';
import { createServer } from 'http';
import { WebSocketServer } from './infrastructure/websocket/WebSocketServer';
import { NotificationScheduler } from './infrastructure/services/NotificationScheduler';
import { logError, logSystem } from './shared/utils/UsageLogger';
dotenv.config();

function formatErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return `${error.name}: ${error.message}`;
    }

    if (typeof error === 'string') {
        return error;
    }

    return stringifyUnknown(error);
}

function getErrorStack(error: unknown): string | undefined {
    if (error instanceof Error) {
        return error.stack;
    }

    if (typeof error === 'object' && error !== null && 'stack' in error && typeof error.stack === 'string') {
        return error.stack;
    }

    return undefined;
}

function logStack(error: unknown): void {
    const stack = getErrorStack(error);
    if (stack) {
        console.error(stack);
    }
}

function stringifyUnknown(value: unknown): string {
    try {
        const serialized = JSON.stringify(value);
        return serialized ?? String(value);
    } catch {
        return String(value);
    }
}

async function main() {
    const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
    if (!DISCORD_TOKEN) {
        throw new Error('DISCORD_TOKEN 環境変数が設定されていません');
    }

    const rawPort = process.env.PORT ?? '8080';
    const PORT = Number(rawPort);
    if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
        throw new Error(`無効なポート番号です: ${rawPort}`);
    }

    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent
        ]
    });

    client.on('error', (error: Error) => {
        logSystem('discord-client', `error: ${formatErrorMessage(error)}`);
        logStack(error);
    });

    process.on('unhandledRejection', (error: unknown) => {
        logSystem('process', `unhandledRejection: ${formatErrorMessage(error)}`);
        logStack(error);
    });

    process.on('uncaughtException', (error: Error) => {
        logSystem('process', `uncaughtException: ${formatErrorMessage(error)}`);
        logStack(error);
    });

    // HTTPサーバーとWebSocketサーバーの初期化
    const server = createServer();
    const wsServer = new WebSocketServer(server);

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
        try {
            await discordAdapter.handleMessage(message);
        } catch (error: unknown) {
            logError(message, error, 'messageCreate');
        }
    });

    // サーバーを起動
    server.listen(PORT, () => {
        console.log(`サーバーがポート ${PORT} で起動しました`);
        console.log(`WebSocketも同じポートで待機中`);
    });

    await client.login(DISCORD_TOKEN);
}

main().catch((err: unknown) => {
    logSystem('startup', `起動エラー: ${formatErrorMessage(err)}`);
    logStack(err);
    process.exit(1);
});
