import { Message, REST, Routes } from 'discord.js';
import { APIApplicationCommand } from 'discord-api-types/v9';
import { createErrorMessage, createSuccessMessage } from '../../../presentation/discord/builders/messages';

import * as dotenv from 'dotenv';
dotenv.config();
import * as fs from 'fs';
import * as path from 'path';

type CommandData = {
    toJSON: () => APIApplicationCommand;
};

type LoadableCommandModule = {
    command?: {
        data?: CommandData;
    };
    createNotifyCommand?: () => {
        data: CommandData;
    };
};

export async function execute(message: Message, guildId: string) {
    const commands: APIApplicationCommand[] = [];
    const commandsPath = path.join(process.cwd(), 'src/infrastructure/commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('-command.ts'));
    const filteredCommandFiles = commandFiles.filter(file => !file.startsWith('classicCommands/'));

    for (const file of filteredCommandFiles) {
        try {
            const module = await import(path.join(process.cwd(), 'dist/infrastructure/commands', file.replace('.ts', '.js'))) as LoadableCommandModule;
            if (module.command?.data) {
                commands.push(module.command.data.toJSON());
            } else if (module.createNotifyCommand && file === 'notify-command.ts') {
                const notifyCommand = module.createNotifyCommand();
                commands.push(notifyCommand.data.toJSON());
            }
        } catch (error) {
            console.error(`Failed to load command ${file}:`, error);
        }
    }

    const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

    try {
        const registeredCommands = await rest.get(
            Routes.applicationGuildCommands(process.env.APPLICATION_ID!, guildId)
        ) as APIApplicationCommand[];

        const commandNames = registeredCommands.map((command) => command.name);

        const commandsToRegister = commands.filter(command => commandNames.includes(command.name));

        await rest.put(
            Routes.applicationGuildCommands(process.env.APPLICATION_ID!, guildId),
            { body: commandsToRegister }
        );

        const embed = createSuccessMessage(message, `UPDATE COMPLETE`, commandsToRegister.map(command => command.name).join(' '));
        await message.reply(embed);
    } catch (error) {
        console.error('エラー:', error);
        const embed = createErrorMessage(message, `UPDATE FAILED`, error instanceof Error ? error.message : String(error));
        await message.reply(embed);
    }
}
