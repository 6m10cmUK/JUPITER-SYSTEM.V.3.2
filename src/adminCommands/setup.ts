import { Message, REST, Routes, EmbedBuilder } from 'discord.js';
import { createErrorMessage, createSuccessMessage } from '../commons/messages';

import * as dotenv from 'dotenv';
dotenv.config();
import * as fs from 'fs';
import * as path from 'path';
import { JUPITER_SYSTEM_VERSION } from '../config/discord_config';

export async function execute(message: Message, guildId: string) {
    const commands = [];
    const commandsPath = path.join(process.cwd(), 'src/commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts'));
    const filteredCommandFiles = commandFiles.filter(file => !file.startsWith('classicCommands/'));

    for (const file of filteredCommandFiles) {
        const { command } = await import(path.join(process.cwd(), 'dist/commands', file.replace('.ts', '.js')));
        commands.push(command.data.toJSON());
    }

    let commandNames = message.content.split(' ')[1] === '-all' || message.content.split(' ')[1] === '-a' ? commands.map(command => command.name) : message.content.slice(1).split(' ');

    if (commandNames.length === 0) {
        return;
    }

    if (message.content.split(' ')[1] === '-standard' || message.content.split(' ')[1] === '-s') {
        commandNames = [
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
        const embed = createErrorMessage(`[JUPITER-SYSTEM ${JUPITER_SYSTEM_VERSION}] SETUP FAILED`, 'commands not found');
        await message.reply(embed);
        return;
    }

    const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

    try {
        await rest.put(
            Routes.applicationGuildCommands(process.env.APPLICATION_ID!, guildId),
            { body: commandsToRegister }
        );

        const embed = createSuccessMessage(`[JUPITER-SYSTEM ${JUPITER_SYSTEM_VERSION}] SETUP COMPLETE`, commandsToRegister.map(command => command.name).join(' '));
        await message.reply(embed);
    } catch (error) {
        console.error('エラー:', error);
        const embed = createErrorMessage(`[JUPITER-SYSTEM ${JUPITER_SYSTEM_VERSION}] SETUP FAILED`, error instanceof Error ? error.message : String(error));
        await message.reply(embed);
    }
}