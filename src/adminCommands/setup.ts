import { Message, REST, Routes } from 'discord.js';
import config from '../config.json';
import * as fs from 'fs';
import * as path from 'path';

export async function execute(message: Message, guildId: string) {
    const commands = [];
    const commandsPath = path.join(process.cwd(), 'src/commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts'));
    const filteredCommandFiles = commandFiles.filter(file => !file.startsWith('classicCommands/'));

    for (const file of filteredCommandFiles) {
        const { command } = await import(path.join(process.cwd(), 'dist/commands', file.replace('.ts', '.js')));
        commands.push(command.data.toJSON());
    }

    const rest = new REST().setToken(config.token);

    try {
        console.log(`${commands.length}個のコマンドを登録するよ`);

        const data = await rest.put(
            Routes.applicationGuildCommands(config.applicationId, guildId),
            { body: commands }
        );

        await message.reply(`${commands.length}個のコマンドを登録したよ！`);
    } catch (error) {
        console.error('エラー:', error);
        await message.reply('コマンドの登録中にエラーが発生しちゃった...');
    }
}

