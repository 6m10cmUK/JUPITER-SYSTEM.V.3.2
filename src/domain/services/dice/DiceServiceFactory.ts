import { DiceRoll } from '../../entities/DiceRoll';
import { DiceExpression } from '../../value-objects/DiceExpression';
import { IDiceService } from './IDiceService';
import { StandardDiceService } from './StandardDiceService';
import { CoCDiceService } from './CoCDiceService';
import { SpecialDiceService } from './SpecialDiceService';

export class DiceServiceFactory implements IDiceService {
    private standardDiceService = new StandardDiceService();
    private cocDiceService = new CoCDiceService();
    private specialDiceService = new SpecialDiceService();

    roll(expression: DiceExpression): DiceRoll {
        const expr = expression.getTargetExpression();
        
        // CCまたはCCBのみは単純な1d100
        if (expression.isCC() || (expression.isCCB() && expr === 'ccb')) {
            return this.standardDiceService.roll('1d100');
        }

        // CCB<=xまたはCCB(x)は6版処理
        if (expression.isCCB()) {
            return this.cocDiceService.rollCCB(expr);
        }

        // CC<=xは7版処理として専用メソッドへ
        if (expression.isCCv7()) {
            return this.cocDiceService.rollCoCv7(expr);
        }
        
        if (expression.isChoice()) {
            return this.specialDiceService.rollChoice(expr);
        }
        
        if (expression.isRes()) {
            return this.cocDiceService.rollRes(expr);
        }

        if (expression.isCBR()) {
            return this.cocDiceService.rollCBR(expr);
        }

        if (expression.isUpperUnlimited()) {
            return this.specialDiceService.rollUpperUnlimited(expr);
        }

        if (expression.isCountDice()) {
            return this.specialDiceService.rollCount(expr);
        }

        if (expression.isBaraDice()) {
            return this.specialDiceService.rollBara(expr);
        }

        if (expression.isCalculation()) {
            return this.specialDiceService.rollCalculation(expr);
        }

        if (expression.isD66()) {
            return this.specialDiceService.rollD66(expr);
        }

        if (expression.isCoCRoll()) {
            return this.cocDiceService.rollCoC(expr);
        }

        if (expression.isFAR()) {
            return this.cocDiceService.rollFAR(expr);
        }
        
        return this.standardDiceService.roll(expr);
    }

    rollMultiple(expression: DiceExpression): DiceRoll[] {
        const count = expression.getRepeatCount();
        const results: DiceRoll[] = [];
        
        for (let i = 0; i < count; i++) {
            results.push(this.roll(expression));
        }
        
        return results;
    }
}