import { DiceExpression } from '../value-objects/DiceExpression';
import { DiceRoll } from '../entities/DiceRoll';
import { DiceServiceFactory } from './dice/DiceServiceFactory';
import { IDiceService } from './dice/IDiceService';

export { IDiceService } from './dice/IDiceService';

/**
 * レガシー互換性のためのDiceServiceクラス
 * 新しい実装は DiceServiceFactory を使用
 */
export class DiceService implements IDiceService {
    private diceServiceFactory = new DiceServiceFactory();

    roll(expression: DiceExpression): DiceRoll {
        return this.diceServiceFactory.roll(expression);
    }

    rollMultiple(expression: DiceExpression): DiceRoll[] {
        return this.diceServiceFactory.rollMultiple(expression);
    }
}