import { EmbedBuilder, Message, ChatInputCommandInteraction } from 'discord.js';
import { DiceOutcome, DiceRollDto, DiceRollResponse } from '../../application/dto/DiceRollDto';
import { generateEmbed } from '../discord/builders/embedGenerator';

export class DiceEmbedFormatter {
    private static readonly DEFAULT_COLOR = 0x888888;

    private static readonly OUTCOME_COLORS: ReadonlyMap<DiceOutcome, number> = new Map([
        ['fumble_malfunction', 0xFF0000],
        ['critical_failure', 0xFF0000],
        ['fumble', 0xFF00FF],
        ['malfunction', 0xFFA500],
        ['critical', 0x00FFFF],
        ['extreme_success', 0x00FF00],
        ['hard_success', 0x0080FF],
        ['regular_success', 0x0000FF],
        ['success', 0x0000FF],
        ['failure', 0xFF0000],
    ]);

    formatResponse(
        response: DiceRollResponse,
        source: Message | ChatInputCommandInteraction
    ): EmbedBuilder {
        if (response.rolls.length === 0) {
            return generateEmbed(source)
                .addFields({
                    name: response.originalExpression,
                    value: '結果なし'
                })
                .setColor(DiceEmbedFormatter.DEFAULT_COLOR);
        }

        const resultTexts = response.rolls.map(roll => roll.result);
        const lastRoll = response.rolls[response.rolls.length - 1];
        const color = DiceEmbedFormatter.resolveColor(lastRoll);

        const embed = generateEmbed(source)
            .addFields({
                name: response.originalExpression,
                value: resultTexts.join('\n')
            })
            .setColor(color);

        return embed;
    }

    /**
     * ダイスロール結果のoutcomeからEmbed色を決定する
     */
    private static resolveColor(roll: DiceRollDto): number {
        return DiceEmbedFormatter.OUTCOME_COLORS.get(roll.outcome) ?? DiceEmbedFormatter.DEFAULT_COLOR;
    }
}
