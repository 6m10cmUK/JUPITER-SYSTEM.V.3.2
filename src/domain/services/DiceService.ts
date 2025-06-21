import { DiceRoll, CCBRoll, ChoiceRoll } from '../entities/DiceRoll';
import { DiceExpression } from '../value-objects/DiceExpression';
import { rollDice } from '../utils/dice';
import { evaluateMathExpression } from '../utils/mathParser';

export interface IDiceService {
    roll(expression: DiceExpression): DiceRoll;
    rollMultiple(expression: DiceExpression): DiceRoll[];
}

export class DiceService implements IDiceService {
    roll(expression: DiceExpression): DiceRoll {
        const expr = expression.getTargetExpression();
        
        if (expression.isCCB()) {
            return this.rollCCB(expr);
        }
        
        if (expression.isChoice()) {
            return this.rollChoice(expr);
        }
        
        if (expression.isRes()) {
            return this.rollRes(expr);
        }
        
        return this.rollStandard(expr);
    }

    rollMultiple(expression: DiceExpression): DiceRoll[] {
        const count = expression.getRepeatCount();
        const results: DiceRoll[] = [];
        
        for (let i = 0; i < count; i++) {
            results.push(this.roll(expression));
        }
        
        return results;
    }

    private rollCCB(expression: string): CCBRoll {
        const parts = expression.split('<=');
        const target = parts[1] ? parseInt(parts[1]) : 50;
        const roll = rollDice(1, 100)[0];
        
        return CCBRoll.evaluate(target, roll);
    }

    private rollChoice(expression: string): ChoiceRoll {
        const choiceMatch = expression.match(/choice\(([^)]+)\)/i);
        if (!choiceMatch) {
            throw new Error('Invalid choice expression');
        }
        
        const choices = choiceMatch[1].split(/[\s,]+/).filter(c => c.length > 0);
        const roll = rollDice(1, choices.length)[0];
        
        return ChoiceRoll.select(choices, roll);
    }

    private rollRes(expression: string): DiceRoll {
        const resMatch = expression.match(/res\((\d+)-(\d+)\)/i);
        if (!resMatch) {
            throw new Error('Invalid res expression');
        }
        
        const left = parseInt(resMatch[1]);
        const right = parseInt(resMatch[2]);
        const target = (left - right) * 5 + 50;
        
        return this.rollCCB(`1d100<=${target}`);
    }

    private rollStandard(expression: string): DiceRoll {
        let workingExpression = expression;
        let detailedExpression = expression;
        const allRolls: number[] = [];
        
        // Replace dice expressions with their results
        const diceRegex = /(\d+)d(\d+)/i;
        let match;
        while ((match = workingExpression.match(diceRegex)) !== null) {
            const count = parseInt(match[1]);
            const faces = parseInt(match[2]);
            const rolls = rollDice(count, faces);
            const total = rolls.reduce((sum, val) => sum + val, 0);
            
            allRolls.push(...rolls);
            
            // Replace in working expression
            workingExpression = workingExpression.replace(match[0], total.toString());
            
            // Update detailed expression
            let resultString;
            if (count > 1) {
                resultString = `${total}(${rolls.join(',')})`;
            } else {
                resultString = `${total}`;
            }
            detailedExpression = detailedExpression.replace(match[0], resultString);
        }
        
        // Evaluate mathematical expression
        workingExpression = workingExpression.replace(/\^/g, '**');
        const finalTotal = evaluateMathExpression(workingExpression);
        
        return DiceRoll.create(expression, allRolls, finalTotal, detailedExpression);
    }
}