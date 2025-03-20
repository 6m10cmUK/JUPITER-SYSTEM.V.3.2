import { Client, GatewayIntentBits } from 'discord.js';
import { DiscordAdapter } from './adapters/discord/DiscordAdapter';
import * as dotenv from 'dotenv';
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

const discordAdapter = new DiscordAdapter(client);

client.once('ready', () => {
    console.log('JUPITER-SYSTEM.V.3.2 is ready.');
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    await discordAdapter.handleMessage(message);
});

client.login(process.env.DISCORD_TOKEN);
