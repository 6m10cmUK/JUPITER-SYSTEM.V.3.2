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

        // ダイス表記（ndm形式）が含まれているかチェック
        const dicePattern = /\d+d\d+/i;
        if (!dicePattern.test(content)) {
            return;
        }

        try {
            const response = await this.rollDiceUseCase.execute({
                expression: content,
                userId: message.author.id,
                guildId: message.guildId ?? undefined
            });

            // Check if any roll resulted in NaN
            const hasNaN = response.rolls.some(roll => isNaN(roll.total));
            if (hasNaN) {
                return;
            }

            const embed = this.formatter.formatResponse(response, message);
            
            await message.reply({ embeds: [embed] });
            
            console.log(
                `${message.guildId} ${message.author.username} ${content} ${response.rolls.map((r: any) => r.result).join(' ')}`
            );
        } catch (error) {
            // Silently fail for classic commands
            console.error('Classic dice roll error:', error);
        }
    }
}

export const diceRoll = async (message: Message) => {
    const handler = new ClassicDiceRollHandler();
    await handler.handle(message);
};