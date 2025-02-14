import { 
    ChatInputCommandInteraction, 
    SlashCommandBuilder,
    SlashCommandStringOption,
    EmbedBuilder
} from 'discord.js';
import { Command } from '../interfaces/Command';
import { choice } from './classicCommands/diceRoll';

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('choice')
        .setDescription('選択肢からランダムに選ぶ')
        .addStringOption((option: SlashCommandStringOption) =>
            option.setName('args')
                .setDescription('選択肢')
                .setRequired(true)
        ) as SlashCommandBuilder,
        
    async execute(interaction: ChatInputCommandInteraction) {
        const args = interaction.options.getString('args') ?? '';
        const [result, color] = await choice(`choice(${args})`);
        await interaction.reply({embeds: [
            new EmbedBuilder()
            .setColor(typeof color === 'string' ? parseInt(color, 16) : color)
            .setAuthor({
                    name: interaction.user.displayName,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setFields(
                    { name: `choice(${args})`, value: result.toString() }
                )
        ]});
    }
}; 