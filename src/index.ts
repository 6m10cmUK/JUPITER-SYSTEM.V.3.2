import { Client, GatewayIntentBits } from 'discord.js';
import { DiscordAdapter } from './adapters/discord/DiscordAdapter';
import { MessageUseCase } from './usecases/MessageUseCase';
import config from './config.json';

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ] 
});

const discordAdapter = new DiscordAdapter(client);
const messageUseCase = new MessageUseCase();

client.once('ready', () => {
    console.log('Botが準備完了だよ！');
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    await discordAdapter.handleMessage(message, messageUseCase);
});

client.login(config.token);
