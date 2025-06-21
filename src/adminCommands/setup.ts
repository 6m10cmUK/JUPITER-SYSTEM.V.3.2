import { Message, REST, Routes } from 'discord.js';
import { createErrorMessage, createSuccessMessage, createInfoMessage } from '../presentation/discord/builders/messages';

import * as dotenv from 'dotenv';
dotenv.config();
import * as fs from 'fs';
import * as path from 'path';

export async function execute(message: Message, guildId: string) {
    const commands = [];
    const commandsPath = path.join(process.cwd(), 'src/infrastructure/commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('-command.ts'));
    const filteredCommandFiles = commandFiles.filter(file => !file.startsWith('classicCommands/'));

    for (const file of filteredCommandFiles) {
        const { command } = await import(path.join(process.cwd(), 'dist/infrastructure/commands', file.replace('.ts', '.js')));
        commands.push(command.data.toJSON());
    }

    if(message.content.split(' ')[1] === '-help' || message.content.split(' ')[1] === '-h') {
        const embed = createInfoMessage(message, 'HELP INFORMATION', '```\n' +
            'SETUP COMMANDS\n' +
            '-all: 全てのコマンドを登録\n' +
            '-pro: プログラムコマンドを登録\n' +
            '-standard: 標準コマンドを登録\n' +
            '-help: ヘルプを表示\n' +
            '```');
        await message.reply(embed);
        return;
    }

    let commandNames = message.content.split(' ')[1] === '-all' || message.content.split(' ')[1] === '-a' ? commands.map(command => command.name) : message.content.slice(1).split(' ');

    if (commandNames.length === 0) {
        return;
    }

    if (message.content.split(' ')[1] === '-pro' || message.content.split(' ')[1] === '-p') {
        commandNames = [
            "ccfolia-log",
            "choice",
            "feature",
            "job",
            "roll",
            "status",
            "name",
            "category-create",
            "category-delete"
        ]
    }

    if (message.content.split(' ')[1] === '-standard' || message.content.split(' ')[1] === '-s') {
        commandNames = [
            "ccfolia-log",
            "choice",
            "feature",
            "job",
            "roll",
            "status",
            "name"
        ]
    }

    const commandsToRegister = commands.filter(command => commandNames.includes(command.name));

    if (commandsToRegister.length === 0) {
        const embed = createErrorMessage(message, `SETUP FAILED`, 'commands not found');
        await message.reply(embed);
        return;
    }

    const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

    try {
        await rest.put(
            Routes.applicationGuildCommands(process.env.APPLICATION_ID!, guildId),
            { body: commandsToRegister }
        );

        const embed = createSuccessMessage(message, `SETUP COMPLETE`, commandsToRegister.map(command => command.name).join(' '));
        await message.reply(embed);
    } catch (error) {
        console.error('エラー:', error);
        const embed = createErrorMessage(message, `SETUP FAILED`, error instanceof Error ? error.message : String(error));
        await message.reply(embed);
    }
}