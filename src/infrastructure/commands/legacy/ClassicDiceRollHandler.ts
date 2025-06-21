import { Message } from 'discord.js';
import { RollDiceUseCase } from '../../../application/use-cases/dice/RollDiceUseCase';
import { DiceService } from '../../../domain/services/DiceService';
import { DiceEmbedFormatter } from '../../../presentation/formatters/DiceEmbedFormatter';

export class ClassicDiceRollHandler {
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
        if (!this.isValidDiceCommand(content)) {
            return;
        }

        try {
            // スペース以降を除外した式のみを処理に渡す
            const parts = content.split(' ');
            const diceExpression = parts[0];
            
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

    private isValidDiceCommand(content: string): boolean {
        // スペースで分割して最初の部分を取得
        const parts = content.split(' ');
        const diceExpression = parts[0];

        // 特殊ケース: "ccb"で始まる場合
        if (diceExpression.toLowerCase().startsWith('ccb')) {
            // ccbのみ、またはccb<=数字 の形式かチェック
            const ccbPattern = /^ccb(?:(?:<|>|<=|>=|=)\d+)?$/i;
            return ccbPattern.test(diceExpression);
        }

        // 特殊ケース: "choice"で始まる場合
        if (diceExpression.toLowerCase().startsWith('choice(')) {
            return true;
        }

        // 特殊ケース: "res"で始まる場合
        if (diceExpression.toLowerCase().startsWith('res(')) {
            return true;
        }

        // ダイス表記のパターン
        const dicePattern = /\d+d\d+/i;
        
        // 最初の部分がダイス表記を含むかチェック
        if (!dicePattern.test(diceExpression)) {
            return false;
        }

        // 文字列が混入していないかチェック
        // 許可する文字: 数字、d/D、+、-、*、/、(、)、<、>、=、空白
        const validPattern = /^[\d\s+\-*/()dD<>=]+$/;
        
        // スペース以降に文字列があっても、最初の部分が有効な式なら通す
        return validPattern.test(diceExpression);
    }
}

export const diceRoll = async (message: Message) => {
    const handler = new ClassicDiceRollHandler();
    await handler.handle(message);
};