import { EmbedBuilder, Message, ChatInputCommandInteraction } from 'discord.js';
import { DiceRollResponse } from '../../application/dto/DiceRollDto';
import { generateEmbed } from '../discord/builders/embedGenerator';

export class DiceEmbedFormatter {
    formatResponse(
        response: DiceRollResponse, 
        source: Message | ChatInputCommandInteraction
    ): EmbedBuilder {
        const resultTexts = response.rolls.map(roll => roll.result);
        const color = response.rolls[response.rolls.length - 1].color;
        
        const embed = generateEmbed(source)
            .addFields({
                name: response.originalExpression,
                value: resultTexts.join('\n')
            })
            .setColor(color);
            
        return embed;
    }
}