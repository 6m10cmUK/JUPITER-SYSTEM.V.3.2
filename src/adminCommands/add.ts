import { Message, REST, Routes } from 'discord.js';
import { APIApplicationCommand } from 'discord-api-types/v9';
import { createErrorMessage, createSuccessMessage } from '../presentation/discord/builders/messages';

import * as dotenv from 'dotenv';
dotenv.config();
import * as fs from 'fs';
import * as path from 'path';

export async function execute(message: Message, guildId: string) {
    const commands: APIApplicationCommand[] = [];
    const commandsPath = path.join(process.cwd(), 'src/infrastructure/commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('-command.ts'));
    const filteredCommandFiles = commandFiles.filter(file => !file.startsWith('classicCommands/'));

    for (const file of filteredCommandFiles) {
        const { command } = await import(path.join(process.cwd(), 'dist/infrastructure/commands', file.replace('.ts', '.js')));
        commands.push(command.data.toJSON());
    }

    const addedCommand = message.content.split(' ')[1];

    if (!addedCommand) {
        const embed = createErrorMessage(message, `ADDED FAILED`, 'command not found');
        await message.reply(embed);
        return;
    }

    const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

    try {
        const registeredCommands = await rest.get(
            Routes.applicationGuildCommands(process.env.APPLICATION_ID!, guildId)
        ) as APIApplicationCommand[];

        const commandNames = registeredCommands.map((command) => command.name);
        commandNames.push(addedCommand);

        if (commands.filter(command => command.name == addedCommand).length == 0) {
            const embed = createErrorMessage(message, `ADDED FAILED`, 'command not found');
            await message.reply(embed);
            return;
        }

        const commandsToRegister = commands.filter(command => commandNames.includes(command.name));

        await rest.put(
            Routes.applicationGuildCommands(process.env.APPLICATION_ID!, guildId),
            { body: commandsToRegister }
        );

        const embed = createSuccessMessage(message, `ADDED COMPLETE`, commandsToRegister.map(command => command.name).join(' '));
        await message.reply(embed);
    } catch (error) {
        console.error('エラー:', error);
        const embed = createErrorMessage(message, `ADDED FAILED`, error instanceof Error ? error.message : String(error));
        await message.reply(embed);
    }
}

