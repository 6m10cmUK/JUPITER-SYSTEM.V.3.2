import { Message, REST, Routes } from 'discord.js';
import * as dotenv from 'dotenv';
dotenv.config();
import * as fs from 'fs';
import * as path from 'path';
import { createSuccessMessage, createErrorMessage } from '../commons/messages';

export async function execute(message: Message, guildId: string) {
    const commands = [];
    const commandsPath = path.join(process.cwd(), 'src/commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts'));
    const filteredCommandFiles = commandFiles.filter(file => !file.startsWith('classicCommands/'));

    for (const file of filteredCommandFiles) {
        const { command } = await import(path.join(process.cwd(), 'dist/commands', file.replace('.ts', '.js')));
        commands.push(command.data.toJSON());
    }

    const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

    let registeredCommandNames: string[] = [];
    try {
        // 現在登録されているコマンドを取得
        const registeredCommands = await rest.get(
            Routes.applicationGuildCommands(process.env.APPLICATION_ID!, guildId)
        );
        const commandList = registeredCommands as any[];
        registeredCommandNames = commandList.map((command) => command.name);

    } catch (error) {
        console.error('エラー:', error);
        const embed = createErrorMessage(message, `UPDATE FAILED`, error instanceof Error ? error.message : String(error));
        await message.reply(embed);
        return;
    }

    const commandsToRegister = commands.filter(command => !registeredCommandNames.includes(command.name));

    try {
        await rest.put(
            Routes.applicationGuildCommands(process.env.APPLICATION_ID!, guildId),
            { body: commandsToRegister }
        );

        const embed = createSuccessMessage(message, `UPDATE COMPLETE`, registeredCommandNames.join(', '));
        await message.reply(embed);
    } catch (error) {
        console.error('エラー:', error);
        const embed = createErrorMessage(message, `UPDATE FAILED`, error instanceof Error ? error.message : String(error));
        await message.reply(embed);
    }
}



