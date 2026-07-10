import { Message } from 'discord.js';
import { RollDiceUseCase } from '../../../application/use-cases/dice/RollDiceUseCase';
import { DiceService } from '../../../domain/services/DiceService';
import { DiceEmbedFormatter } from '../../../presentation/formatters/DiceEmbedFormatter';
import { convertFullWidthToHalfWidth } from '../../../shared/utils/stringUtils';
import { DiceCommandValidator } from './validation/diceCommandValidator';
import { DiceSystemError, InvalidExpressionError } from '../../../shared/errors/DiceSystemError';
import { logMessageResult, logSystem } from '../../../shared/utils/UsageLogger';

export class DiceRollHandler {
    private readonly rollDiceUseCase: RollDiceUseCase;
    private readonly formatter: DiceEmbedFormatter;

    constructor() {
        // シングルトンパターンによる最適化
        const diceService = new DiceService(); // DiceService内部でシングルトンファクトリを使用
        this.rollDiceUseCase = new RollDiceUseCase(diceService);
        this.formatter = new DiceEmbedFormatter();
    }

    async handle(message: Message): Promise<void> {
        const content = message.content;
        
        if (content.includes('\n')) {
            return;
        }

        // クラシックダイスコマンドとして有効かチェック
        if (!DiceCommandValidator.isValidCommand(content)) {
            return;
        }

        try {
            // スペース以降を除外した式のみを処理に渡す
            const parts = content.split(' ');
            const diceExpression = convertFullWidthToHalfWidth(parts[0]);
            
            const response = await this.rollDiceUseCase.execute({
                expression: diceExpression,
                userId: message.author.id,
                guildId: message.guildId ?? undefined
            });

            // Check if any roll resulted in NaN
            const hasNaN = response.rolls.some(roll => isNaN(roll.total));
            if (hasNaN) {
                return;
            }

            // 1行目（フィールド名）には元のメッセージ全体を表示
            const embedWithFullExpression = this.formatter.formatResponse(response, message);
            embedWithFullExpression.data.fields![0].name = content;
            
            await message.reply({ embeds: [embedWithFullExpression] });
            
            logMessageResult(
                message,
                'dice-roll',
                `status=success expression=${diceExpression} source=${content} rolls=${response.rolls.map(roll => roll.result).join(' ') || '-'}`
            );
            
        } catch (error) {
            // メッセージベースのダイスロールは控えめなエラー表示
            if (error instanceof InvalidExpressionError) {
                // 無効な式の場合は静かに無視（他のメッセージと混同を避けるため）
                console.warn('Invalid dice expression (ignored):', error.expression);
                return;
            }
            
            if (error instanceof DiceSystemError) {
                // システムエラーの場合はリアクションで通知
                try {
                    await message.react('❌');
                } catch (reactionError: unknown) {
                    logSystem(
                        'diceroll',
                        `リアクション付与失敗: ${reactionError instanceof Error ? reactionError.message : String(reactionError)}`
                    );
                }
                console.error('Dice system error:', {
                    error: error.message,
                    expression: content,
                    userId: message.author.id,
                    guildId: message.guildId
                });
                return;
            }
            
            // その他のエラーはログのみ（クラシックコマンドは静かに失敗）
            console.error('Classic dice roll error:', {
                error: error instanceof Error ? error.message : String(error),
                expression: content,
                userId: message.author.id,
                guildId: message.guildId
            });
        }
    }
}
