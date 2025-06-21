import { 
    ChatInputCommandInteraction, 
    SlashCommandBuilder,
    SlashCommandStringOption,
} from 'discord.js';
import { Command } from '../../interfaces/Command';
import { choice } from './legacy/choiceFunction';
import { generateEmbed } from '../../presentation/discord/builders/embedGenerator';
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
        const embed = generateEmbed(interaction)
            .setColor(typeof color === 'string' ? parseInt(color, 16) : color)
            .setFields(
                { name: `choice(${args})`, value: result.toString() }
            );
        await interaction.reply({embeds: [embed]});
    }
}; 