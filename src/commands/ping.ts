import { CommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from '../interfaces/Command';

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('roll')
        .setDescription('ダイスを振る'),
        
    async execute(interaction: CommandInteraction) {
        await interaction.reply('Pong!');
    }
}; 