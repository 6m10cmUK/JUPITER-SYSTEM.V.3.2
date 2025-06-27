import { DiceRoll } from '../../entities/DiceRoll';
import { rollDice } from '../../utils/dice';
import { evaluateMathExpression } from '../../utils/mathParser';

export class StandardDiceService {
    roll(expression: string): DiceRoll {
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
        
        // 割り算の特殊処理（/2U = 切り上げ、/2R = 四捨五入）
        const divisionMatch = expression.match(/\/(\d+)([UR])?$/i);
        if (divisionMatch) {
            // 割り算部分を除いた式を評価
            const baseExpression = expression.replace(/\/\d+[UR]?$/i, '');
            let baseWorkingExpression = baseExpression;
            const allBaseRolls: number[] = [];
            
            // ダイスの処理（割り算前の式）
            const diceRegex = /(\d+)d(\d+)/i;
            let match;
            while ((match = baseWorkingExpression.match(diceRegex)) !== null) {
                const count = parseInt(match[1]);
                const faces = parseInt(match[2]);
                const rolls = rollDice(count, faces);
                const total = rolls.reduce((sum, val) => sum + val, 0);
                
                allBaseRolls.push(...rolls);
                baseWorkingExpression = baseWorkingExpression.replace(match[0], total.toString());
            }
            
            baseWorkingExpression = baseWorkingExpression.replace(/\^/g, '**');
            const baseTotal = evaluateMathExpression(baseWorkingExpression);
            
            const divisor = parseInt(divisionMatch[1]);
            const mode = divisionMatch[2]?.toUpperCase();
            
            let finalTotal: number;
            if (mode === 'U') {
                // 切り上げ
                finalTotal = Math.ceil(baseTotal / divisor);
                detailedExpression = `${baseTotal} / ${divisor} ＞ ${finalTotal}（切り上げ）`;
            } else if (mode === 'R') {
                // 四捨五入
                finalTotal = Math.round(baseTotal / divisor);
                detailedExpression = `${baseTotal} / ${divisor} ＞ ${finalTotal}（四捨五入）`;
            } else {
                // 切り捨て（デフォルト）
                finalTotal = Math.floor(baseTotal / divisor);
                detailedExpression = `${baseTotal} / ${divisor} ＞ ${finalTotal}`;
            }
            
            return DiceRoll.create(expression, allBaseRolls, finalTotal, detailedExpression);
        }
        
        // Evaluate mathematical expression
        workingExpression = workingExpression.replace(/\^/g, '**');
        const finalTotal = evaluateMathExpression(workingExpression);
        
        return DiceRoll.create(expression, allRolls, finalTotal, detailedExpression);
    }
}