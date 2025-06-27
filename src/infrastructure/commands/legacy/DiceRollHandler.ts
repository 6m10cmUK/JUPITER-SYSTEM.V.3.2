import { Message } from 'discord.js';
import { RollDiceUseCase } from '../../../application/use-cases/dice/RollDiceUseCase';
import { DiceService } from '../../../domain/services/DiceService';
import { DiceEmbedFormatter } from '../../../presentation/formatters/DiceEmbedFormatter';
import { convertFullWidthToHalfWidth } from '../../../shared/utils/stringUtils';
import { DiceCommandValidator } from './validation/diceCommandValidator';

export class DiceRollHandler {
    private readonly rollDiceUseCase: RollDiceUseCase;
    private readonly formatter: DiceEmbedFormatter;

    constructor() {
        const diceService = new DiceService();
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
            
            console.log(
                `${message.guildId} ${message.author.username} ${content} ${response.rolls.map((r: any) => r.result).join(' ')}`
            );
        } catch (error) {
            // Silently fail for classic commands
            console.error('Classic dice roll error:', error);
        }
    }
}

