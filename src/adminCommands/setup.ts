import { Message, REST, Routes, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import config from '../config.json' assert { type: "json" };
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

export const execute = async (message: Message, guildId: string) => {
    message.reply(guildId);

    const commands: RESTPostAPIApplicationCommandsJSONBody[] = [];
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const commandsPath = path.join(__dirname, '..', 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = `file://${path.join(commandsPath, file)}`;
        const { data } = await import(filePath);
        console.log(filePath);
        if (data) {
            commands.push(data.toJSON());
        }
    }

    console.log(commands);

    return;

    const rest = new REST().setToken(config.token);

    try {
        console.log(`${commands.length}個のコマンドを登録するよ`);

        const data = await rest.put(
            Routes.applicationGuildCommands(config.applicationId, guildId),
            { body: commands },
        ) as RESTPostAPIApplicationCommandsJSONBody[];

        message.reply(`${data.length}個のコマンドを登録したよ！`);
    } catch (error) {
        console.error(error);
        message.reply('コマンドの登録中にエラーが発生しちゃった...');
    }
}; 

