import { Message, REST, Routes, EmbedBuilder } from 'discord.js';
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
        // ... existing error handling code ...
    }

    const commandsToRegister = commands.filter(command => !registeredCommandNames.includes(command.name));

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
                name: `[JUPITER-SYSTEM ${JUPITER_SYSTEM_VERSION}] UPDATE COMPLETE`, 
                value: registeredCommandNames.join(' '), 
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
                name: `[JUPITER-SYSTEM ${JUPITER_SYSTEM_VERSION}] UPDATE FAILED`, 
                value: error instanceof Error ? error.message : String(error), 
            }
        )
        .setColor(0xff0000);
        await message.reply({ embeds: [embed] });
    }
}



