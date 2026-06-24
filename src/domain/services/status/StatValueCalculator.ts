/**
 * ステータス値のドメイン計算を行うサービス
 */

import { IValidationStateService } from './IValidationStateService';
import { StatusServiceFactory } from './StatusServiceFactory';
import { CoCVersion } from '../../../application/dto/StatusDto';

export class StatValueCalculator {
    /**
     * バージョンに対応する StatusService を取得
     * ダイス式・倍率はサービスを単一の情報源として参照する（定義の二重管理を防ぐ）。
     */
    private static getService(version: string) {
        return StatusServiceFactory.create((version === '7' ? '7' : '6') as CoCVersion);
    }

    /**
     * バージョンごとの表示倍率を取得
     * 6版は等倍、7版はパーセンタイル表記のため5倍。
     */
    private static getMultiplier(version: string): number {
        return this.getService(version).getMultiplier();
    }

    /**
     * ステータスのダイス式を取得（StatusService から取得）
     */
    private static getStatFormula(type: string, version: string): { count: number; sides: number; modifier: number } {
        return this.getService(version).getStatFormula(type);
    }

    /**
     * 指定された値がダイスで可能な範囲内かチェック
     * 7版は表示値（×5）で渡されるため、5の倍数でなければ不適格として弾く。
     */
    static isValueInValidRange(type: string, version: string, value: number): boolean {
        const formula = this.getStatFormula(type, version);
        const multiplier = this.getMultiplier(version);

        // 表示倍率で割り切れない値はダイスでは作れないため弾く
        if (value % multiplier !== 0) return false;

        const rawValue = value / multiplier;
        const min = formula.count + formula.modifier;
        const max = formula.count * formula.sides + formula.modifier;

        return rawValue >= min && rawValue <= max;
    }

    /**
     * 最適化された値を計算
     */
    static calculateOptimalValue(
        type: string,
        version: string,
        messageId: string,
        validationService: IValidationStateService
    ): number {
        const temporaryValue = validationService.getTemporaryValue(messageId);
        if (temporaryValue !== undefined) {
            if (StatValueCalculator.isValueInValidRange(type, version, temporaryValue)) {
                return temporaryValue;
            } else {
                validationService.clearValidation(messageId);
                return -1;
            }
        }

        return -1;
    }

    /**
     * 最適化された詳細文字列を生成
     * value は表示値（7版は×5）で渡される前提。ダイスの目に割り戻して整形する。
     * BaseStatusService.rollIndividualStat の出力形式に揃える。
     */
    static generateOptimalDetails(type: string, value: number, version: string = '6'): string {
        const formula = StatValueCalculator.getStatFormula(type, version);
        const multiplier = StatValueCalculator.getMultiplier(version);

        // 範囲外・割り切れない場合は安全側のフォールバック
        if (!StatValueCalculator.isValueInValidRange(type, version, value)) {
            return '6,6,6';
        }

        const rawValue = value / multiplier;
        const combo = StatValueCalculator.generateDiceCombo(rawValue, formula.count, formula.sides, formula.modifier);

        return formula.modifier > 0
            ? `(${combo})+${formula.modifier}`
            : `(${combo})`;
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
