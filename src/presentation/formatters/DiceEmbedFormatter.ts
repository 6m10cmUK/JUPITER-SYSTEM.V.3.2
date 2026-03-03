import { EmbedBuilder, Message, ChatInputCommandInteraction } from 'discord.js';
import { DiceRollDto, DiceRollResponse } from '../../application/dto/DiceRollDto';
import { generateEmbed } from '../discord/builders/embedGenerator';

export class DiceEmbedFormatter {
    private static readonly DEFAULT_COLOR = 0x888888;

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

        // ファンブル＆故障 or 致命的失敗
        if (result.includes('ファンブル＆故障') || result.includes('致命的失敗')) {
            return 0xFF0000;
        }
        if (result.includes('ファンブル')) {
            return 0xFF00FF;
        }

        // 故障（オレンジ）
        if (result.includes('故障')) {
            return 0xFFA500;
        }

        // CoC 7版の成功レベル判定
        if (result.includes('クリティカル')) return 0x00FFFF;
        if (result.includes('イクストリーム成功')) return 0x00FF00;
        if (result.includes('ハード成功')) return 0x0080FF;
        if (result.includes('レギュラー成功')) return 0x0000FF;

        // 一般的な成功/失敗
        if (result.includes('成功')) return 0x0000FF;
        if (result.includes('失敗')) return 0xFF0000;

        return DiceEmbedFormatter.DEFAULT_COLOR;
    }
}
