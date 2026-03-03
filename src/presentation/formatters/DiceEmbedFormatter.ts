import { EmbedBuilder, Message, ChatInputCommandInteraction } from 'discord.js';
import { DiceRollDto, DiceRollResponse } from '../../application/dto/DiceRollDto';
import { generateEmbed } from '../discord/builders/embedGenerator';

export class DiceEmbedFormatter {
    private static readonly DEFAULT_COLOR = 0x888888;

    private static readonly COLOR_MAPPINGS: ReadonlyArray<{ keyword: string; color: number }> = [
        { keyword: 'ファンブル＆故障', color: 0xFF0000 },
        { keyword: '致命的失敗', color: 0xFF0000 },
        { keyword: 'ファンブル', color: 0xFF00FF },
        { keyword: '故障', color: 0xFFA500 },
        { keyword: 'クリティカル', color: 0x00FFFF },
        { keyword: 'イクストリーム成功', color: 0x00FF00 },
        { keyword: 'ハード成功', color: 0x0080FF },
        { keyword: 'レギュラー成功', color: 0x0000FF },
        { keyword: '成功', color: 0x0000FF },
        { keyword: '失敗', color: 0xFF0000 },
    ];

    formatResponse(
        response: DiceRollResponse,
        source: Message | ChatInputCommandInteraction
    ): EmbedBuilder {
        if (response.rolls.length === 0) {
            return generateEmbed(source)
                .addFields({
                    name: response.originalExpression,
                    value: '結果なし'
                });
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
     * ダイスロール結果のテキストからEmbed色を決定する
     */
    private static resolveColor(roll: DiceRollDto): number {
        const result = roll.result;
        const match = DiceEmbedFormatter.COLOR_MAPPINGS.find(m => result.includes(m.keyword));
        return match?.color ?? DiceEmbedFormatter.DEFAULT_COLOR;
    }
}
