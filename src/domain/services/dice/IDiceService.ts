import { DiceRoll } from '../../entities/DiceRoll';
import { DiceExpression } from '../../value-objects/DiceExpression';

export interface IDiceService {
    roll(expression: DiceExpression): DiceRoll;
    rollMultiple(expression: DiceExpression): DiceRoll[];
}