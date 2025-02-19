import { Message, REST, Routes, EmbedBuilder } from 'discord.js';
import * as dotenv from 'dotenv';
dotenv.config();
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

    let commandNames = message.content.split(' ')[1] === 'all' ? commands.map(command => command.name) : message.content.split(' ').slice(1);

    if (commandNames.length === 0) {
        return;
    }

    if (message.content.split(' ')[1] === 'standard') {
        commandNames = [
            "choice",
            "feature",
            "job",
            "roll",
            "status"
        ]
    }

    const commandsToRegister = commands.filter(command => commandNames.includes(command.name));


    const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

    try {
        await rest.put(
            Routes.applicationGuildCommands(process.env.APPLICATION_ID!, guildId),
            { body: commandsToRegister }
        );

        const embed = new EmbedBuilder()
        .setTitle('SUCCESS')
        .setAuthor({
            name: message.author.displayName,
            iconURL: message.author.displayAvatarURL()
        })
        .setFields(
            { 
                name: '[JUPITER-SYSTEM v3.2.0] SETUP COMPLETE', 
                value: commandNames.join(' '), 
            }
        )
        .setColor(0x0099ff);

        await message.reply({ embeds: [embed] });
    } catch (error) {
        console.error('エラー:', error);
        const embed = new EmbedBuilder()
        .setTitle('ERROR')
        .setAuthor({
            name: message.author.displayName,
            iconURL: message.author.displayAvatarURL()
        })
        .setFields(
            { 
                name: '[JUPITER-SYSTEM v3.2.0] SETUP FAILED', 
                value: error instanceof Error ? error.message : String(error), 
            }
        )
        .setColor(0xff0000);
        await message.reply({ embeds: [embed] });

    }
}