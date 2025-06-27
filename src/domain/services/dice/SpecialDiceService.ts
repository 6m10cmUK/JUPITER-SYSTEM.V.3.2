import { DiceRoll, ChoiceRoll } from '../../entities/DiceRoll';
import { rollDice } from '../../utils/dice';
import { evaluateMathExpression } from '../../utils/mathParser';

export class SpecialDiceService {
    rollChoice(expression: string): ChoiceRoll {
        // choice()とchoice[]の両方に対応
        const choiceMatch = expression.match(/choice[\(\[]([^\)\]]+)[\)\]]/i);
        if (!choiceMatch) {
            throw new Error('Invalid choice expression');
        }
        
        const choices = choiceMatch[1].split(/[\s,]+/).filter(c => c.length > 0);
        const roll = rollDice(1, choices.length)[0];
        
        return ChoiceRoll.select(choices, roll);
    }

    rollUpperUnlimited(expression: string): DiceRoll {
        const match = expression.match(/^(\d+)u(\d+)\[(\d+)\]$/i);
        if (!match) {
            throw new Error('Invalid upper unlimited expression');
        }
        
        const count = parseInt(match[1]);
        const faces = parseInt(match[2]);
        const threshold = parseInt(match[3]);
        
        let rolls: number[] = [];
        let totalRolls: number[] = [];
        let remainingDice = count;
        
        // 最大100回まで振り足し
        for (let i = 0; i < 100 && remainingDice > 0; i++) {
            const currentRolls = rollDice(remainingDice, faces);
            rolls = rolls.concat(currentRolls);
            totalRolls = totalRolls.concat(currentRolls);
            
            // 閾値以上の出目の数を数える
            remainingDice = currentRolls.filter(roll => roll >= threshold).length;
        }
        
        const total = totalRolls.reduce((sum, val) => sum + val, 0);
        const detailedExpression = `${total}(${totalRolls.join(',')})`;
        
        return DiceRoll.create(expression, totalRolls, total, detailedExpression);
    }

    rollBara(expression: string): DiceRoll {
        const match = expression.match(/^(\d+)b(\d+)$/i);
        if (!match) {
            throw new Error('Invalid bara dice expression');
        }
        
        const count = parseInt(match[1]);
        const faces = parseInt(match[2]);
        const rolls = rollDice(count, faces);
        
        // バラバラ出力の場合、合計ではなく個別の値を表示
        const detailedExpression = rolls.join(',');
        
        return DiceRoll.create(expression, rolls, 0, detailedExpression);
    }

    rollCount(expression: string): DiceRoll {
        const match = expression.match(/^(\d+)b(\d+)(>=|<=|>|<|=)(\d+)$/i);
        if (!match) {
            throw new Error('Invalid count dice expression');
        }
        
        const count = parseInt(match[1]);
        const faces = parseInt(match[2]);
        const operator = match[3];
        const threshold = parseInt(match[4]);
        
        const rolls = rollDice(count, faces);
        
        // 条件を満たすダイスの個数を数える
        let successCount = 0;
        rolls.forEach(roll => {
            switch(operator) {
                case '>=': if (roll >= threshold) successCount++; break;
                case '<=': if (roll <= threshold) successCount++; break;
                case '>': if (roll > threshold) successCount++; break;
                case '<': if (roll < threshold) successCount++; break;
                case '=': if (roll === threshold) successCount++; break;
            }
        });
        
        const detailedExpression = `${successCount}成功 / ${rolls.join(',')}`;
        
        return DiceRoll.create(expression, rolls, successCount, detailedExpression);
    }

    rollCalculation(expression: string): DiceRoll {
        const match = expression.match(/^c\((.+)\)$/i);
        if (!match) {
            throw new Error('Invalid calculation expression');
        }
        
        const calcExpression = match[1];
        const result = evaluateMathExpression(calcExpression);
        
        return DiceRoll.create(expression, [], result, `${result}`);
    }

    rollD66(expression: string): DiceRoll {
        const lowerExpr = expression.toLowerCase();
        const roll1 = rollDice(1, 6)[0];
        const roll2 = rollDice(1, 6)[0];
        
        let result: number;
        if (lowerExpr === 'd66s') {
            // 昇順ソート
            result = Math.min(roll1, roll2) * 10 + Math.max(roll1, roll2);
        } else {
            // そのまま（D66, D66N）
            result = roll1 * 10 + roll2;
        }
        
        const detailedExpression = `${result}`;
        
        return DiceRoll.create(expression, [roll1, roll2], result, detailedExpression);
    }
}