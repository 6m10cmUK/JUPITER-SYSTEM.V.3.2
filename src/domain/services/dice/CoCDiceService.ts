import { DiceRoll, CCBRoll } from '../../entities/DiceRoll';
import { CoCDiceRoll, FARRoll, CoCDifficulty } from '../../entities/CoCDiceRoll';
import { rollDice } from '../../utils/dice';

export class CoCDiceService {
    rollCCB(expression: string): CCBRoll | DiceRoll {
        const lowerExpr = expression.toLowerCase();
        
        // CCB(n)<=x 6版故障判定付き
        const breakdownMatch = expression.match(/^ccb\((\d+)\)(?:<=(\d+))?$/i);
        if (breakdownMatch) {
            const breakdownNumber = parseInt(breakdownMatch[1]);
            const target = breakdownMatch[2] ? parseInt(breakdownMatch[2]) : 100;
            const roll = rollDice(1, 100)[0];
            
            // 故障判定用のCCBRollを作成
            const ccbRoll = CCBRoll.evaluate(target, roll, 'ccb');
            // 故障情報を追加
            (ccbRoll as any).breakdownNumber = breakdownNumber;
            return ccbRoll;
        }
        
        // cc<=50 または ccb<=50 のような形式の場合
        const comparisonMatch = expression.match(/^(ccb?)(<=|>=|<|>|=)(\d+)$/i);
        if (comparisonMatch) {
            // CC<=xは1%ルール、CCB<=xは5%ルール
            const ruleType = comparisonMatch[1].toLowerCase() === 'cc' ? 'cc' : 'ccb';
            const operator = comparisonMatch[2];
            const target = parseInt(comparisonMatch[3]);
            const roll = rollDice(1, 100)[0];
            
            // 現在は<=のみサポート（他の演算子は後で実装）
            if (operator === '<=') {
                return CCBRoll.evaluate(target, roll, ruleType);
            }
        }
        
        // 1d100<=50 のような形式
        if (expression.startsWith('1d100<=')) {
            const target = parseInt(expression.split('<=')[1]);
            const roll = rollDice(1, 100)[0];
            // 1d100の場合は特殊判定なし
            return DiceRoll.create(expression, [roll], roll, `${roll}`);
        }
        
        // デフォルトは1d100
        const roll = rollDice(1, 100)[0];
        return DiceRoll.create('1d100', [roll], roll, `${roll}`);
    }

    rollRes(expression: string): DiceRoll {
        const resMatch = expression.match(/^(resb?)\((\d+)-(\d+)\)$/i);
        if (!resMatch) {
            throw new Error('Invalid res expression');
        }
        
        const isResb = resMatch[1].toLowerCase() === 'resb';
        const left = parseInt(resMatch[2]);
        const right = parseInt(resMatch[3]);
        const target = (left - right) * 5 + 50;
        
        const ruleType = isResb ? 'ccb' : 'cc';
        const roll = rollDice(1, 100)[0];
        
        return CCBRoll.evaluate(target, roll, ruleType);
    }

    rollCBR(expression: string): DiceRoll {
        const cbrMatch = expression.match(/^(cbrb?)\((\d+),(\d+)\)$/i);
        if (!cbrMatch) {
            throw new Error('Invalid CBR expression');
        }
        
        const isCbrb = cbrMatch[1].toLowerCase() === 'cbrb';
        const skill1 = parseInt(cbrMatch[2]);
        const skill2 = parseInt(cbrMatch[3]);
        
        const ruleType = isCbrb ? 'ccb' : 'cc';
        const roll1 = rollDice(1, 100)[0];
        const roll2 = rollDice(1, 100)[0];
        
        // 組み合わせロール：両方の判定を行い、両方成功した場合のみ成功
        const result1 = CCBRoll.evaluate(skill1, roll1, ruleType);
        const result2 = CCBRoll.evaluate(skill2, roll2, ruleType);
        
        // 両方の結果を含むカスタムロールを作成
        const combinedExpression = `${expression} -> ${roll1},${roll2}`;
        const bothSuccess = result1.isSuccess() && result2.isSuccess();
        const bothCritical = result1.isCriticalSuccess() && result2.isCriticalSuccess();
        const eitherFumble = result1.isCriticalFailure() || result2.isCriticalFailure();
        
        // 組み合わせ結果を表すCCBRollを作成
        return new CCBRoll(
            combinedExpression,
            [roll1, roll2],
            roll2, // 最後のロール値を使用
            skill2, // 最後のターゲット値を使用
            bothSuccess,
            false, // スペシャルは適用しない
            bothCritical,
            eitherFumble
        );
    }

    rollCoC(expression: string): CoCDiceRoll | DiceRoll {
        // CC単体の場合はCoC 7版の1d100（成功レベル判定なし）
        if (expression.toLowerCase() === 'cc') {
            const roll = rollDice(1, 100)[0];
            return DiceRoll.create(expression, [roll], roll, `${roll}`);
        }

        // パターンマッチング
        // CC(±x)<=y, CC<=y(r/h/e/c)
        const patterns = [
            /^cc\(([+-]?\d+)\)<=(\d+)([rhec])?$/i,  // CC(±2)<=50r
            /^cc<=(\d+)([rhec])$/i                  // CC<=50r
        ];

        let bonusDice = 0;
        let target: number | undefined;
        let difficulty: CoCDifficulty | undefined;

        for (const pattern of patterns) {
            const match = expression.match(pattern);
            if (match) {
                if (pattern.source.includes('([+-]?\\d+)')) {
                    bonusDice = parseInt(match[1]);
                    target = parseInt(match[2]);
                    difficulty = match[3] as CoCDifficulty | undefined;
                } else {
                    target = parseInt(match[1]);
                    difficulty = match[2] as CoCDifficulty;
                }
                break;
            }
        }

        const roll = rollDice(1, 100)[0];

        if (target !== undefined) {
            return CoCDiceRoll.evaluate(target, roll, bonusDice, difficulty);
        } else {
            // 目標値なしの場合は単純な1d100表示
            return DiceRoll.create(expression, [roll], roll, `${roll}`);
        }
    }

    rollFAR(expression: string): FARRoll {
        // FAR(w,x,y,z,d,v) - 空のパラメータも許可
        const match = expression.match(/^far\((\d+),(\d+),(\d+)(?:,([+-]?\d+)?)?(?:,([rhec])?)?(?:,(\d+)?)?\)$/i);
        if (!match) {
            throw new Error('Invalid FAR expression');
        }

        const bullets = parseInt(match[1]);
        const skill = parseInt(match[2]);
        const malfunction = parseInt(match[3]);
        const bonusDice = match[4] ? parseInt(match[4]) : 0;
        const difficulty = match[5] as CoCDifficulty | undefined;
        const volleySize = match[6] ? parseInt(match[6]) : 1;

        return FARRoll.evaluate(bullets, skill, malfunction, bonusDice, difficulty, volleySize);
    }

    rollCoCv7(expression: string): CoCDiceRoll {
        // CC<=xの形式（7版処理）
        const match = expression.match(/^cc<=(\d+)$/i);
        if (!match) {
            throw new Error('Invalid CC v7 expression');
        }

        const target = parseInt(match[1]);
        const roll = rollDice(1, 100)[0];

        // 7版の成功レベル判定（ボーナスダイスなし、難易度指定なし）
        return CoCDiceRoll.evaluate(target, roll, 0, undefined);
    }
}