import { Client, GatewayIntentBits } from 'discord.js';
import config from './config.json' assert { type: "json" };
import { execute } from './adminCommands/setup.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once('ready', () => {
    console.log('Botが準備完了だよ！');
});

client.on('messageCreate', message => {
    if (message.author.bot) return;

    const prefix = '/#';
    if (!message.content.startsWith(prefix)) return;

    const commandBody = message.content.slice(prefix.length).trim();
    const args = commandBody.split(/\s+/);
    const command = args.shift()?.toLowerCase();

    if (command === 'setup') {
        const guildId = message.guild?.id;
        if (!guildId) return;
        execute(message, guildId);
    }
});

client.login(config.token);
