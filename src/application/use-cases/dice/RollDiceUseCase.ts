import { DiceService } from '../../../domain/services/DiceService';
import { DiceExpression } from '../../../domain/value-objects/DiceExpression';
import { DiceRollRequest, DiceRollResponse, DiceRollDto } from '../../dto/DiceRollDto';
import { CCBRoll, ChoiceRoll } from '../../../domain/entities/DiceRoll';
import { convertFullWidthToHalfWidth } from '../../../shared/utils/stringUtils';

export class RollDiceUseCase {
    constructor(private readonly diceService: DiceService) {}

    async execute(request: DiceRollRequest): Promise<DiceRollResponse> {
        const normalizedExpression = convertFullWidthToHalfWidth(request.expression);
        const diceExpression = new DiceExpression(normalizedExpression);
        
        const rolls = diceExpression.hasRepeat() 
            ? this.diceService.rollMultiple(diceExpression)
            : [this.diceService.roll(diceExpression)];

        const rollDtos: DiceRollDto[] = rolls.map((roll, index) => {
            const dto = this.mapToDto(roll);
            
            if (rolls.length > 1) {
                dto.result = `#${index + 1} ${dto.result}`;
            }
            
            return dto;
        });

        return {
            rolls: rollDtos,
            originalExpression: request.expression
        };
    }

    private mapToDto(roll: any): DiceRollDto {
        if (roll instanceof CCBRoll) {
            return this.mapCCBToDto(roll);
        }
        
        if (roll instanceof ChoiceRoll) {
            return this.mapChoiceToDto(roll);
        }
        
        return this.mapStandardToDto(roll);
    }

    private mapCCBToDto(roll: CCBRoll): DiceRollDto {
        let result = `＞ **${roll.getTotal()}** `;
        let color = 0x888888;
        
        if (roll.getTarget()) {
            if (roll.isSuccess()) {
                color = 0x0000FF;
                result += `**<= ${roll.getTarget()}** ＞ **成功** `;
                
                if (roll.isSpecial()) {
                    result += `**/ スペシャル** `;
                }
                if (roll.isCriticalSuccess()) {
                    result += `**/ 決定的成功** `;
                }
            } else {
                color = 0xFF0000;
                result += `**<=${roll.getTarget()}** ＞ **失敗** `;
                
                if (roll.isCriticalFailure()) {
                    result += `**/ 致命的失敗** `;
                }
            }
        }
        
        return {
            expression: roll.getExpression(),
            result,
            total: roll.getTotal(),
            color
        };
    }

    private mapChoiceToDto(roll: ChoiceRoll): DiceRollDto {
        return {
            expression: roll.getExpression(),
            result: `＞ **${roll.getSelectedChoice()}**`,
            total: roll.getTotal(),
            color: 0x888888
        };
    }

    private mapStandardToDto(roll: any): DiceRollDto {
        return {
            expression: roll.getExpression(),
            result: ` ＞ ${roll.getDetailedExpression()} ＞ **${roll.getTotal()}**`,
            total: roll.getTotal(),
            color: 0x888888
        };
    }
}