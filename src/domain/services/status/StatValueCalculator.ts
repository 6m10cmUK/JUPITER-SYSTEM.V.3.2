/**
 * ステータス値のドメイン計算を行うサービス
 */

import { ValidationStateService } from '../../../application/services/ValidationStateService';

export class StatValueCalculator {
    /**
     * 指定された値がダイスで可能な範囲内かチェック
     */
    static isValueInValidRange(type: string, version: string, value: number): boolean {
        const ranges: Record<string, [number, number]> = {
            'STR': [3, 18],  // 3d6
            'CON': [3, 18],  // 3d6
            'POW': [3, 18],  // 3d6
            'DEX': [3, 18],  // 3d6
            'APP': [3, 18],  // 3d6
            'SIZ': [8, 18],  // 2d6+6
            'INT': [8, 18],  // 2d6+6
            'EDU': version === '6' ? [6, 21] : [3, 18]  // 6版: 3d6+3, 7版: 3d6
        };

        const range = ranges[type];
        if (!range) return false;

        return value >= range[0] && value <= range[1];
    }

    /**
     * 最適化された値を計算
     */
    static calculateOptimalValue(type: string, version: string, messageId: string): number {
        const temporaryValue = ValidationStateService.getTemporaryValue(messageId);
        if (temporaryValue !== undefined) {
            if (StatValueCalculator.isValueInValidRange(type, version, temporaryValue)) {
                return temporaryValue;
            } else {
                ValidationStateService.clearValidation(messageId);
                return -1;
            }
        }

        return 0;
    }

    /**
     * 最適化された詳細文字列を生成
     */
    static generateOptimalDetails(type: string, value: number): string {
        // SIZ, INTの場合 (2d6+6)
        if (['SIZ', 'INT'].includes(type) && value >= 8 && value <= 18) {
            return '(' + StatValueCalculator.generateDiceCombo(value - 6, 2, 6, 0) + ')+6';
        }

        // EDU 6版の場合 (3d6+3)
        if (type === 'EDU' && value >= 6 && value <= 21) {
            return '(' + StatValueCalculator.generateDiceCombo(value - 3, 3, 6, 0) + ')+3';
        }

        // その他のステータス (3d6)
        if (value >= 3 && value <= 18) {
            return '(' + StatValueCalculator.generateDiceCombo(value, 3, 6, 0) + ')';
        }

        // デフォルト
        const patterns: Record<string, string[]> = {
            '18': ['6,6,6', '(6,6)+6'],
            '21': ['(6,6,6)+3']
        };

        if (value === 21) return patterns['21'][0];
        if (value === 18) {
            if (['SIZ', 'INT'].includes(type)) {
                return patterns['18'][1];
            }
            return patterns['18'][0];
        }

        return '6,6,6';
    }

    /**
     * ダイスの組み合わせを生成
     */
    private static generateDiceCombo(target: number, diceCount: number, diceSides: number, bonus: number): string {
        const targetWithoutBonus = target - bonus;
        const min = diceCount;
        const max = diceCount * diceSides;

        if (targetWithoutBonus < min || targetWithoutBonus > max) {
            return Array(diceCount).fill(diceSides).join(',');
        }

        const combinations = StatValueCalculator.generateAllCombinations(targetWithoutBonus, diceCount, diceSides);
        const selected = combinations[Math.floor(Math.random() * combinations.length)];

        for (let i = selected.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [selected[i], selected[j]] = [selected[j], selected[i]];
        }

        return selected.join(',');
    }

    /**
     * 指定された合計値になるすべてのダイスの組み合わせを生成
     */
    private static generateAllCombinations(target: number, diceCount: number, diceSides: number): number[][] {
        const combinations: number[][] = [];

        function backtrack(remaining: number, diceLeft: number, current: number[]): void {
            if (diceLeft === 0) {
                if (remaining === 0) {
                    combinations.push([...current]);
                }
                return;
            }

            const minValue = 1;
            const maxValue = Math.min(diceSides, remaining - (diceLeft - 1));

            for (let value = minValue; value <= maxValue; value++) {
                if (remaining - value >= diceLeft - 1 && remaining - value <= (diceLeft - 1) * diceSides) {
                    current.push(value);
                    backtrack(remaining - value, diceLeft - 1, current);
                    current.pop();
                }
            }
        }

        backtrack(target, diceCount, []);
        return combinations;
    }
}
